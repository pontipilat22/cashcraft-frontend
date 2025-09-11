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

export type SupportedLanguage =
  | 'en' | 'ru' | 'kk' | 'uk' | 'zh' | 'ar'
  | 'de' | 'fr' | 'hi' | 'tr' | 'el' | 'it' | 'pl';

export const LANGUAGES: Record<
  SupportedLanguage,
  { code: SupportedLanguage; name: string; nativeName: string }
> = {
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

const i18n = new I18n({ en, ru, kk, uk, zh, ar, de, fr, hi, tr, el, it, pl });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

/** Безопасно получить код языка устройства ('en', 'ru', ...) */
const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales?.() ?? [];
    // languageTag: 'en-US', 'ru-RU', ...
    const tag =
      (locales[0]?.languageTag ||
        // web-полифил может иметь другие поля
        (locales as any)[0]?.localeIdentifier ||
        'en-US') as string;
    return (tag.split('-')[0] || 'en').toLowerCase();
  } catch {
    return 'en';
  }
};

export const initializeI18n = async (): Promise<void> => {
  try {
    const deviceLanguage = getDeviceLanguage();
    if (deviceLanguage in LANGUAGES) {
      i18n.locale = deviceLanguage as SupportedLanguage;
    } else {
      i18n.locale = 'en';
    }
  } catch (e) {
    console.error('Error initializing i18n:', e);
    i18n.locale = 'en';
  }
};

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  i18n.locale = language;
};

export const getCurrentLanguage = (): SupportedLanguage => {
  const l = (i18n.locale || 'en') as string;
  return (l in LANGUAGES ? l : 'en') as SupportedLanguage;
};

export const t = (key: string, options?: any): string => i18n.t(key, options);

export default i18n;
