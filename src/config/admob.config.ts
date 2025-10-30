import { Platform } from 'react-native';

/**
 * Конфигурация Google AdMob
 *
 * ВАЖНО: Перед публикацией замените TEST_IDS на реальные ID из AdMob Console!
 */

// ==========================================
// БОЕВЫЕ ID (реальные ID из AdMob Console)
// ==========================================
// ВАЖНО: Используем БОЕВУЮ рекламу (не тестовую)
const IDS = {
  android: {
    banner: 'ca-app-pub-8853061795959758/9297826581', // ✅ Banner ID
    interstitial: 'ca-app-pub-8853061795959758/5043365733', // ✅ Interstitial_Transactions
    rewarded: 'ca-app-pub-8853061795959758/6188146193', // ✅ Rewarded_ProUnlock
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716', // TODO: Создать Banner блок для iOS
    interstitial: 'ca-app-pub-3940256099942544/4411468910', // TODO: Создать Interstitial блок для iOS
    rewarded: 'ca-app-pub-3940256099942544/1712485313', // TODO: Создать Rewarded блок для iOS
  },
};

// Экспорт ID для текущей платформы
export const AdMobConfig = {
  banner: Platform.select({
    android: IDS.android.banner,
    ios: IDS.ios.banner,
    default: IDS.android.banner,
  })!,

  interstitial: Platform.select({
    android: IDS.android.interstitial,
    ios: IDS.ios.interstitial,
    default: IDS.android.interstitial,
  })!,

  rewarded: Platform.select({
    android: IDS.android.rewarded,
    ios: IDS.ios.rewarded,
    default: IDS.android.rewarded,
  })!,
};

// Настройки показа рекламы
export const AdSettings = {
  // Минимальный интервал между межстраничной рекламой (мс)
  minInterstitialInterval: 2 * 60 * 1000, // 2 минуты

  // Количество транзакций до показа межстраничной рекламы
  transactionsBeforeInterstitial: 6, // Каждые 6 транзакций

  // Показывать баннеры
  showBanners: true,

  // Показывать межстраничную рекламу
  showInterstitials: true,

  // Доступна ли реклама с вознаграждением
  enableRewarded: true,
};

// Типы наград
export const RewardTypes = {
  UNLOCK_THIRD_ACCOUNT: 'unlock_third_account', // Разблокировать 3-й счет
  DISABLE_ADS_24H: 'disable_ads_24h', // Отключить рекламу на 24ч (опционально)
} as const;

export type RewardType = typeof RewardTypes[keyof typeof RewardTypes];
