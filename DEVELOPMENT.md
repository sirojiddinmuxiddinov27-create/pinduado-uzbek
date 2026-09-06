# Rivojlantiruvchi uchun qo'llanma

## Arxitektura

```
App.tsx                          → UI: holat, kesh, "Accessibility sozlamalarini ochish" tugmasi
src/services/TranslationService.ts → JS tarafidagi tarjima (hozircha ishlatilmaydi, zaxira sifatida qoldi)
android-native/
  PinduoduoAccessibilityService.kt → HAQIQIY overlay logikasi (native Kotlin)
  accessibility_service_config.xml → Android'ga xizmat qanday ishlashini aytadi
plugins/
  withAccessibilityOverlay.js      → Expo Config Plugin: prebuild paytida
                                      yuqoridagi ikki faylni android/ papkasiga
                                      avtomatik joylaydi va build.gradle'ga
                                      OkHttp bog'liqligini qo'shadi
```

## Nega alohida Kotlin kerak edi?

`AccessibilityService` va ekran ustiga oyna chizish (`WindowManager` +
`TYPE_ACCESSIBILITY_OVERLAY`) — bular Android'ning **native API'lari**.
Expo'ning managed JS/TS qatlamida bunday narsalarga to'g'ridan-to'g'ri
kirish imkoni yo'q. Shuning uchun native Kotlin fayl yozib, uni Expo
Config Plugin orqali build jarayoniga avtomatik ulaymiz — bu to'liq
`expo eject` qilmasdan native kod qo'shishning standart yo'li.

## Qanday ishlaydi (runtime oqimi)

1. Foydalanuvchi ilovani ochadi → "Accessibility Sozlamalarini Ochish"
   tugmasini bosadi → Android sozlamalarida "Pinduoduo O'zbek Tarjimon"ni
   qo'lda yoqadi (bu qadam **avtomatlashtirib bo'lmaydi** — Android
   xavfsizlik siyosati shart qiladi)
2. Foydalanuvchi Pinduoduo ilovasini (`com.xunmeng.pinduoduo`) ochadi
3. `PinduoduoAccessibilityService` shu paket ustida `TYPE_WINDOW_STATE_CHANGED`
   / `TYPE_WINDOW_CONTENT_CHANGED` hodisalarini ushlaydi
4. Ekrandagi barcha matn tugunlari (`AccessibilityNodeInfo`) yig'iladi
5. Har bir matn MyMemory API orqali tarjima qilinadi (xitoycha/inglizcha
   aniqlanadi, natija keshlanadi)
6. Tarjima asl matn koordinatalari ustiga kichik oq fon + yashil matn
   ko'rinishida `TYPE_ACCESSIBILITY_OVERLAY` oynasi sifatida chiziladi

## Loyihani qurish (build)

Bu muhitda (sandbox) **Android SDK/Gradle yo'q**, shuning uchun APK'ni
shu yerda kompilyatsiya qilib bo'lmaydi. Buni o'zingizning
kompyuteringizda yoki EAS orqali qiling:

```bash
npm install

# Variant A: EAS Build (Expo bulutida, Android Studio shart emas)
npx eas build --platform android --profile preview

# Variant B: Mahalliy (Android Studio + SDK o'rnatilgan bo'lishi kerak)
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
```

`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`
fayllari repoda yo'q — build qilishdan oldin ularni qo'shishingiz kerak
(1024x1024 PNG tavsiya etiladi).

## Muhim eslatmalar

- **Til juftligi**: `PinduoduoAccessibilityService.kt`dagi
  `detectLangPair()` matnda xitoycha belgi bo'lsa `zh|uz`, aks holda
  `en|uz` deb hisoblaydi. Agar ilova sizning qurilmangizda boshqa tilda
  ko'rinsa, shu funksiyani moslashtiring.
- **MyMemory API** — bepul, lekin kunlik so'rovlar chegarasi bor
  (taxminan 5000 so'z/kun anonim foydalanuvchi uchun). Ko'p matn tez-tez
  o'zgarsa, limitga tezroq yetishingiz mumkin.
- **Play Store siyosati**: Google Play boshqa ilovalar ustiga chiqadigan
  yoki ularning ekran mazmunini o'qiydigan accessibility-asosidagi
  ilovalarga qattiq talablar qo'yadi (aniq maqsad va foydalanuvchi
  roziligi bo'lishi shart) — agar buni Play Store'ga chiqarmoqchi
  bo'lsangiz, shu siyosatni albatta o'qib chiqing. Shaxsiy foydalanish
  yoki APK'ni to'g'ridan-to'g'ri o'rnatish (sideload) uchun bu cheklov
  qo'llanilmaydi.
- Bu xizmat faqat `com.xunmeng.pinduoduo` paketi faolligida ishlaydi
  (boshqa ilovalarga ta'sir qilmaydi) — `accessibility_service_config.xml`
  dagi `packageNames` shuni ta'minlaydi.
