import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSLATE_CACHE_KEY = 'translation_cache';
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

const translationCache = new Map<string, string>();

export const TranslationService = {
  async translateToUzbek(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    if (translationCache.has(text)) {
      return translationCache.get(text) || text;
    }

    try {
      const response = await axios.get(TRANSLATE_API, {
        params: {
          q: text,
          langpair: 'en|uz',
        },
        timeout: 5000,
      });

      if (response.data?.responseStatus === 200) {
        const translatedText = response.data.responseData.translatedText;
        translationCache.set(text, translatedText);
        return translatedText;
      }
    } catch (error) {
      console.error('Tarjima xatosi:', error);
    }

    return text;
  },

  async translateMultiple(texts: string[]): Promise<string[]> {
    return Promise.all(texts.map(text => this.translateToUzbek(text)));
  },

  async clearCache(): Promise<void> {
    translationCache.clear();
    await AsyncStorage.removeItem(TRANSLATE_CACHE_KEY);
  },

  async saveCache(): Promise<void> {
    try {
      const cacheData = JSON.stringify(Array.from(translationCache.entries()));
      await AsyncStorage.setItem(TRANSLATE_CACHE_KEY, cacheData);
    } catch (error) {
      console.error('Keshni saqlashda xato:', error);
    }
  },

  async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(TRANSLATE_CACHE_KEY);
      if (cacheData) {
        const entries = JSON.parse(cacheData);
        entries.forEach(([key, value]: [string, string]) => {
          translationCache.set(key, value);
        });
      }
    } catch (error) {
      console.error('Keshni yuklashda xato:', error);
    }
  },

  getCacheSize(): number {
    return translationCache.size;
  },
};
