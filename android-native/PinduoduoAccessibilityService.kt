package com.pinduado_uzbek

import android.accessibilityservice.AccessibilityService
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.TextView
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap

/**
 * Pinduoduo ilovasi ustida ishlaydigan tarjima overlay xizmati.
 *
 * Ishlash tartibi:
 * 1. Faqat TARGET_PACKAGE (Pinduoduo) ekranda bo'lganda ishga tushadi
 * 2. Ekrandagi barcha matn tugunlarini (AccessibilityNodeInfo) yig'ib chiqadi
 * 3. Har bir matnni MyMemory tarjima API orqali o'zbek tiliga o'giradi (va keshlaydi)
 * 4. Asl matn ustiga, xuddi shu koordinatalarga tarjima qilingan matnni
 *    TYPE_ACCESSIBILITY_OVERLAY oynasi sifatida chizadi
 *
 * MUHIM: TYPE_ACCESSIBILITY_OVERLAY ishlatilgani uchun alohida
 * SYSTEM_ALERT_WINDOW ruxsatini so'rash shart emas — bu faqat
 * accessibility xizmatlariga tegishli maxsus overlay turi.
 */
class PinduoduoAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PddUzOverlay"
        private const val TARGET_PACKAGE = "com.xunmeng.pinduoduo"
        private const val TRANSLATE_URL = "https://api.mymemory.translated.net/get"
        private const val MIN_TEXT_LEN = 2
    }

    private lateinit var windowManager: WindowManager
    private val overlayViews = mutableListOf<View>()
    private val translationCache = ConcurrentHashMap<String, String>()
    private val httpClient = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        Log.d(TAG, "Xizmat ulandi, $TARGET_PACKAGE kuzatilmoqda")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() != TARGET_PACKAGE) {
            return
        }

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                clearOverlays()
                val root = rootInActiveWindow ?: return
                try {
                    scanAndTranslate(root)
                } finally {
                    root.recycle()
                }
            }
        }
    }

    /** Tugunlar daraxtini aylanib chiqib, matnli tugunlarni tarjima qilish uchun yuboradi */
    private fun scanAndTranslate(node: AccessibilityNodeInfo) {
        val text = node.text?.toString()
        if (!text.isNullOrBlank() && text.trim().length >= MIN_TEXT_LEN && !isSkippable(text)) {
            val bounds = Rect()
            node.getBoundsInScreen(bounds)
            if (bounds.width() > 0 && bounds.height() > 0) {
                translate(text) { translated ->
                    if (translated.trim() != text.trim()) {
                        mainHandler.post { showOverlay(bounds, translated) }
                    }
                }
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try {
                scanAndTranslate(child)
            } finally {
                child.recycle()
            }
        }
    }

    /** Faqat raqam/pul belgisi bo'lgan matnlarni tarjima qilishning hojati yo'q */
    private fun isSkippable(text: String): Boolean {
        val trimmed = text.trim()
        return trimmed.matches(Regex("^[0-9¥$₽%.,:+\\-\\s]+$"))
    }

    /** Matn xitoychami yoki inglizchami — shunga qarab langpair tanlaydi */
    private fun detectLangPair(text: String): String {
        val hasCjk = text.any { it.code in 0x4E00..0x9FFF }
        return if (hasCjk) "zh|uz" else "en|uz"
    }

    private fun translate(text: String, callback: (String) -> Unit) {
        translationCache[text]?.let {
            callback(it)
            return
        }

        val baseUrl = HttpUrl.parse(TRANSLATE_URL)
        if (baseUrl == null) {
            callback(text)
            return
        }

        val url = baseUrl.newBuilder()
            .addQueryParameter("q", text)
            .addQueryParameter("langpair", detectLangPair(text))
            .build()

        val request = Request.Builder().url(url).build()
        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Tarjima so'rovi xato: ${e.message}")
                callback(text)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    try {
                        val body = it.body?.string()
                        if (body == null) {
                            callback(text)
                            return
                        }
                        val json = JSONObject(body)
                        val translated = json.getJSONObject("responseData")
                            .getString("translatedText")
                        translationCache[text] = translated
                        callback(translated)
                    } catch (e: Exception) {
                        Log.e(TAG, "Javobni tahlil qilishda xato: ${e.message}")
                        callback(text)
                    }
                }
            }
        })
    }

    /** Asl matn koordinatalari ustiga tarjimani chizadigan kichik overlay oyna */
    private fun showOverlay(bounds: Rect, translatedText: String) {
        val label = TextView(this).apply {
            text = translatedText
            setBackgroundColor(0xF2FFFFFF.toInt())
            setTextColor(0xFF1B5E20.toInt())
            textSize = 11f
            maxLines = 3
            setPadding(8, 2, 8, 2)
            gravity = Gravity.CENTER
        }

        val params = WindowManager.LayoutParams(
            bounds.width().coerceAtLeast(1),
            bounds.height().coerceAtLeast(1),
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = bounds.left
            y = bounds.top
        }

        try {
            windowManager.addView(label, params)
            overlayViews.add(label)
        } catch (e: Exception) {
            Log.e(TAG, "Overlay chizib bo'lmadi: ${e.message}")
        }
    }

    private fun clearOverlays() {
        overlayViews.forEach {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                // View allaqachon olib tashlangan bo'lishi mumkin
            }
        }
        overlayViews.clear()
    }

    override fun onInterrupt() {
        clearOverlays()
    }

    override fun onDestroy() {
        super.onDestroy()
        clearOverlays()
    }
}
