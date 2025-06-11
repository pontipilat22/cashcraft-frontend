import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en';
import ru from '../locales/ru';

// Ключ для хранения выбранного языка
const LANGUAGE_KEY = '@cashcraft_language';

// Тип для поддерживаемых языков
export type SupportedLanguage = 'en' | 'ru';

// Доступные языки
export const LANGUAGES: Record<SupportedLanguage, { code: SupportedLanguage; name: string; nativeName: string }> = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
};

// Создаем экземпляр i18n
const i18n = new I18n({
  en,
  ru,
});

// Настройка i18n
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Получить сохраненный язык
export const getSavedLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error getting saved language:', error);
    return null;
  }
};

// Сохранить язык
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Инициализация языка
export const initializeI18n = async (): Promise<void> => {
  try {
    // Пытаемся получить сохраненный язык
    const savedLanguage = await getSavedLanguage();
    
    if (savedLanguage && savedLanguage in LANGUAGES) {
      i18n.locale = savedLanguage;
    } else {
      // Определяем язык устройства
      const deviceLanguage = Localization.locale.split('-')[0];
      
      // Проверяем, поддерживается ли язык устройства
      if (deviceLanguage in LANGUAGES) {
        i18n.locale = deviceLanguage;
      } else {
        // Если язык не поддерживается, используем английский
        i18n.locale = 'en';
      }
      
      // Сохраняем выбранный язык
      await saveLanguage(i18n.locale);
    }
  } catch (error) {
    console.error('Error initializing i18n:', error);
    i18n.locale = 'en';
  }
};

// Изменить язык
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  i18n.locale = language;
  await saveLanguage(language);
};

// Получить текущий язык
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.locale as SupportedLanguage;
};

// Хелпер для перевода
export const t = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

// Экспортируем объект i18n для прямого использования если нужно
export default i18n; 