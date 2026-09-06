import React, { useEffect } from 'react';
import { StatusBar, SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { TranslationService } from './src/services/TranslationService';

export default function App() {
  const [isTranslationActive, setIsTranslationActive] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [cacheSize, setCacheSize] = React.useState(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    const initApp = async () => {
      await TranslationService.loadCache();
      setCacheSize(TranslationService.getCacheSize());
      // Avtomatik ON qilish (login keraksiz)
      setIsTranslationActive(true);
    };
    initApp();
  }, []);

  const toggleTranslation = async () => {
    setLoading(true);
    try {
      const newState = !isTranslationActive;
      
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setIsTranslationActive(newState);

      Alert.alert(
        newState ? '✅ Tarjima YOQILDI!' : '❌ Tarjima O\'CHIRILDI!',
        newState
          ? 'Pinduado ilovasidagi barcha matnlar Uzbek tilga tarjimalnadi.\n\nPinduado ilovasiga o\'ting!'
          : 'Tarjima to\'xtatildi.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const openAccessibilitySettings = async () => {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.ACCESSIBILITY_SETTINGS
      );
    } catch (error) {
      Alert.alert(
        '⚠️ Xato',
        'Sozlamalarni ochib bo\'lmadi. Qo\'lda: Sozlamalar → Maxsus imkoniyatlar → O\'rnatilgan xizmatlar → "Pinduoduo O\'zbek Tarjimon"ni yoqing.'
      );
    }
  };

  const clearCache = async () => {
    Alert.alert(
      '🗑️ Keshni Tozalash',
      `${cacheSize} ta tarjima o'chiriladi. Tasdiqlaysizmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'O\'chirish',
          onPress: async () => {
            await TranslationService.clearCache();
            setCacheSize(0);
            Alert.alert('✅ Tayyorasi!', 'Kesh tozalandi');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🇺🇿 Pinduado Uzbek</Text>
          <Text style={styles.subtitle}>Avtomatik Tarjima Ilovasi</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isTranslationActive ? '#E8F5E9' : '#FFEBEE' }]}>
          <Text style={styles.cardTitle}>📊 Tarjima Holati</Text>
          <Text style={[styles.statusText, { color: isTranslationActive ? '#2E7D32' : '#C62828' }]}>
            {isTranslationActive ? '● YOQILGAN ✅' : '● O\'CHIRILGAN ❌'}
          </Text>
        </View>

        <Animated.View style={[styles.animatedButton, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: isTranslationActive ? '#FF6B6B' : '#4CAF50' }
            ]}
            onPress={toggleTranslation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isTranslationActive ? '🛑 Tarjimani O\'chir' : '▶️ Tarjimani Yoq'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.card, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}>
          <Text style={styles.cardTitle}>🛠️ Haqiqiy Overlay Xizmati</Text>
          <Text style={styles.instructionText}>
            Android xavfsizlik siyosati tufayli, ekran ustiga chizish uchun
            "Maxsus imkoniyatlar" (Accessibility) xizmatini QO'LDA yoqishingiz kerak.
            Bu ilova avtomatik yoqa olmaydi.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#1976D2', marginTop: 8 }]} onPress={openAccessibilitySettings}>
            <Text style={styles.buttonSmallText}>⚙️ Accessibility Sozlamalarini Ochish</Text>
          </TouchableOpacity>
          <Text style={[styles.instructionText, { marginTop: 8, fontSize: 12, color: '#1565C0' }]}>
            Ro'yxatdan "Pinduoduo O'zbek Tarjimon"ni toping va yoqing. Shundan
            so'ng Pinduoduo ilovasini oching — matnlar avtomatik tarjima
            qilinib, ustiga chiqadi.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📖 Qo\'llanma</Text>
          <Text style={styles.instructionText}>✅ Ilova avtomatik YOQILGAN!</Text>
          <Text style={styles.instructionText}>1️⃣ Pinduado ilovasiga o\'ting</Text>
          <Text style={styles.instructionText}>2️⃣ Barcha matnlar Uzbek tilga tarjimalnadi! ✨</Text>
          <Text style={styles.instructionText}>3️⃣ Tarjimani O\'chirish uchun yuqoridagi tugmani bosing</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Xususiyatlari</Text>
          <Text style={styles.featureText}>✓ Login keraksiz</Text>
          <Text style={styles.featureText}>✓ Avtomatik ishga tushadi</Text>
          <Text style={styles.featureText}>✓ Barcha matnlar tarjimalnadi</Text>
          <Text style={styles.featureText}>✓ Real-time tarjima</Text>
          <Text style={styles.featureText}>✓ Cache qilish</Text>
          <Text style={styles.featureText}>✓ Tez va yengil</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💾 Kesh: {cacheSize} ta matn</Text>
          <TouchableOpacity style={styles.button} onPress={clearCache}>
            <Text style={styles.buttonSmallText}>🗑️ Keshni Tozalash</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>v1.1.0 • Login keraksiz • Uzbek tilga tarjima</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  animatedButton: {
    marginBottom: 24,
  },
  mainButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSmallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
