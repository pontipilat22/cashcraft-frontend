import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from '../locales/en';
import ru from '../locales/ru';
import kk from '../locales/kk';
import uk from '../locales/uk';
import zh from '../locales/zh';
import ar from '../locales/ar';
import de from '../locales/de';
import fr from '../locales/fr';
import hi from '../locales/hi';
import tr from '../locales/tr';
import el from '../locales/el';
import it from '../locales/it';
import pl from '../locales/pl';

// Тип для поддерживаемых языков
export type SupportedLanguage = 'en' | 'ru' | 'kk' | 'uk' | 'zh' | 'ar' | 'de' | 'fr' | 'hi' | 'tr' | 'el' | 'it' | 'pl';

// Доступные языки
export const LANGUAGES: Record<SupportedLanguage, { code: SupportedLanguage; name: string; nativeName: string }> = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  kk: { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski' },
};

// Создаем экземпляр i18n
const i18n = new I18n({
  en,
  ru,
  kk,
  uk,
  zh,
  ar,
  de,
  fr,
  hi,
  tr,
  el,
  it,
  pl,
});

// Настройка i18n
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Инициализация языка
export const initializeI18n = async (): Promise<void> => {
  try {
    // Всегда определяем язык устройства
    const fullLocale = Localization.locale;
    const deviceLanguage = fullLocale.split('-')[0];
    
    // Проверяем, поддерживается ли язык устройства
    if (deviceLanguage in LANGUAGES) {
      i18n.locale = deviceLanguage;
    } else {
      // Если язык не поддерживается, используем английский
      i18n.locale = 'en';
    }
    
    // НЕ сохраняем язык при инициализации - позволяем приложению
    // всегда открываться на языке телефона
  } catch (error) {
    console.error('Error initializing i18n:', error);
    i18n.locale = 'en';
  }
};

// Изменить язык
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  i18n.locale = language;
  // НЕ сохраняем язык - приложение всегда будет открываться на языке телефона
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