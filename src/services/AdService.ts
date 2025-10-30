import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdSettings } from '../config/admob.config';

/**
 * Сервис для управления показом рекламы
 * Отслеживает частоту показов и условия отображения
 */

const STORAGE_KEYS = {
  LAST_INTERSTITIAL: 'last_interstitial_timestamp',
  TRANSACTION_COUNT: 'ad_transaction_count', // Счетчик транзакций для рекламы
  ACCOUNT_COUNT: 'ad_account_count', // Счетчик созданных счетов для рекламы
  AD_FREE_UNTIL: 'ad_free_until_timestamp',
  LAST_TAB_SWITCH_AD: 'last_tab_switch_ad_date', // Дата последнего показа рекламы при переключении вкладок (формат: YYYY-MM-DD)
};

class AdServiceClass {
  private transactionCount: number = 0;
  private accountCount: number = 0;
  private lastInterstitialTime: number = 0;

  /**
   * Инициализация сервиса
   */
  async init() {
    try {
      const [lastInterstitial, transactionCount, accountCount] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_INTERSTITIAL),
        AsyncStorage.getItem(STORAGE_KEYS.TRANSACTION_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_COUNT),
      ]);

      this.lastInterstitialTime = lastInterstitial ? parseInt(lastInterstitial, 10) : 0;
      this.transactionCount = transactionCount ? parseInt(transactionCount, 10) : 0;
      this.accountCount = accountCount ? parseInt(accountCount, 10) : 0;

      console.log('[AdService] Initialized:', {
        lastInterstitialTime: new Date(this.lastInterstitialTime).toISOString(),
        transactionCount: this.transactionCount,
        accountCount: this.accountCount,
      });
    } catch (error) {
      console.error('[AdService] Init error:', error);
    }
  }

  /**
   * Увеличить счетчик транзакций
   * Вызывается после создания транзакции
   */
  async incrementTransactionCount() {
    this.transactionCount++;
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTION_COUNT, this.transactionCount.toString());
    console.log('[AdService] Transaction count:', this.transactionCount);
  }

  /**
   * Сбросить счетчик транзакций
   */
  async resetTransactionCount() {
    this.transactionCount = 0;
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTION_COUNT, '0');
  }

  /**
   * Проверить, можно ли показать межстраничную рекламу
   */
  async canShowInterstitial(): Promise<boolean> {
    const now = Date.now();

    // Проверяем, не активна ли опция "без рекламы"
    const adFreeUntil = await this.getAdFreeUntil();
    if (adFreeUntil && now < adFreeUntil) {
      console.log('[AdService] Ad-free period active');
      return false;
    }

    // Проверяем минимальный интервал
    const timeSinceLastAd = now - this.lastInterstitialTime;
    if (timeSinceLastAd < AdSettings.minInterstitialInterval) {
      console.log('[AdService] Too soon since last interstitial:', timeSinceLastAd / 1000, 'sec');
      return false;
    }

    // Проверяем количество транзакций (каждые 6 транзакций)
    if (this.transactionCount < AdSettings.transactionsBeforeInterstitial) {
      console.log('[AdService] Not enough transactions:', this.transactionCount, '/', AdSettings.transactionsBeforeInterstitial);
      return false;
    }

    console.log('[AdService] Can show interstitial! Transactions:', this.transactionCount);
    return true;
  }

  /**
   * Отметить показ межстраничной рекламы
   */
  async markInterstitialShown() {
    const now = Date.now();
    this.lastInterstitialTime = now;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_INTERSTITIAL, now.toString());
    await this.resetTransactionCount();
    console.log('[AdService] Interstitial shown at:', new Date(now).toISOString());
  }

  /**
   * Увеличить счетчик счетов
   * Вызывается после создания счета
   */
  async incrementAccountCount() {
    this.accountCount++;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT_COUNT, this.accountCount.toString());
    console.log('[AdService] Account count:', this.accountCount);
  }

  /**
   * Проверить, нужно ли показать interstitial при создании счета
   * Показываем каждый 3-й счет: 3, 6, 9, 12...
   */
  async shouldShowInterstitialForAccount(): Promise<boolean> {
    const now = Date.now();

    // Проверяем минимальный интервал между рекламой
    const timeSinceLastAd = now - this.lastInterstitialTime;
    if (timeSinceLastAd < AdSettings.minInterstitialInterval) {
      console.log('[AdService] Account ad skipped - too soon since last ad:', timeSinceLastAd / 1000, 'sec');
      return false;
    }

    // Каждый 3-й счет
    const shouldShow = this.accountCount > 0 && this.accountCount % 3 === 0;
    console.log('[AdService] Should show interstitial for account?', shouldShow, 'Count:', this.accountCount);
    return shouldShow;
  }

  /**
   * Получить максимальное количество счетов для пользователя
   * @param isPremium - есть ли Premium подписка
   */
  async getMaxAccounts(isPremium: boolean): Promise<number> {
    // Безлимит для всех (реклама показывается при создании каждого 3-го счета)
    return Infinity;
  }

  /**
   * Активировать период без рекламы (награда за просмотр)
   * @param hours - количество часов без рекламы
   */
  async activateAdFree(hours: number = 24) {
    const until = Date.now() + hours * 60 * 60 * 1000;
    await AsyncStorage.setItem(STORAGE_KEYS.AD_FREE_UNTIL, until.toString());
    console.log('[AdService] Ad-free activated until:', new Date(until).toISOString());
  }

  /**
   * Получить время окончания периода без рекламы
   */
  async getAdFreeUntil(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.AD_FREE_UNTIL);
      return value ? parseInt(value, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Проверить, активен ли период без рекламы
   */
  async isAdFreeActive(): Promise<boolean> {
    const until = await this.getAdFreeUntil();
    if (!until) return false;

    const now = Date.now();
    const isActive = now < until;

    if (!isActive) {
      // Период истек, удаляем
      await AsyncStorage.removeItem(STORAGE_KEYS.AD_FREE_UNTIL);
    }

    return isActive;
  }

  /**
   * Проверить, нужно ли показывать баннеры
   * @param isPremium - есть ли у пользователя подписка Premium
   */
  async shouldShowBanners(isPremium: boolean): Promise<boolean> {
    if (isPremium) return false;
    if (!AdSettings.showBanners) return false;

    const isAdFree = await this.isAdFreeActive();
    return !isAdFree;
  }

  /**
   * Проверить, нужно ли показывать межстраничную рекламу
   * @param isPremium - есть ли у пользователя подписка Premium
   */
  async shouldShowInterstitial(isPremium: boolean): Promise<boolean> {
    if (isPremium) return false;
    if (!AdSettings.showInterstitials) return false;

    const isAdFree = await this.isAdFreeActive();
    if (isAdFree) return false;

    return await this.canShowInterstitial();
  }

  /**
   * Получить оставшееся время без рекламы (для отображения)
   */
  async getRemainingAdFreeTime(): Promise<{ hours: number; minutes: number } | null> {
    const until = await this.getAdFreeUntil();
    if (!until) return null;

    const now = Date.now();
    const diff = until - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    return { hours, minutes };
  }

  /**
   * Проверить, нужно ли показать рекламу при переключении вкладок
   * Показываем один раз в день
   */
  async shouldShowInterstitialForTabSwitch(): Promise<boolean> {
    try {
      const lastAdDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TAB_SWITCH_AD);
      const today = new Date().toISOString().split('T')[0]; // Формат: YYYY-MM-DD

      // Если реклама еще не показывалась сегодня
      if (lastAdDate !== today) {
        console.log('[AdService] Tab switch ad allowed - last shown:', lastAdDate, 'today:', today);
        return true;
      }

      console.log('[AdService] Tab switch ad already shown today:', today);
      return false;
    } catch (error) {
      console.error('[AdService] Error checking tab switch ad:', error);
      return false;
    }
  }

  /**
   * Отметить показ рекламы при переключении вкладок
   */
  async markTabSwitchAdShown() {
    const today = new Date().toISOString().split('T')[0]; // Формат: YYYY-MM-DD
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TAB_SWITCH_AD, today);
    console.log('[AdService] Tab switch ad marked as shown for today:', today);
  }

  /**
   * Сбросить все данные (для тестирования)
   */
  async reset() {
    this.transactionCount = 0;
    this.accountCount = 0;
    this.lastInterstitialTime = 0;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LAST_INTERSTITIAL,
      STORAGE_KEYS.TRANSACTION_COUNT,
      STORAGE_KEYS.ACCOUNT_COUNT,
      STORAGE_KEYS.AD_FREE_UNTIL,
      STORAGE_KEYS.LAST_TAB_SWITCH_AD,
    ]);
    console.log('[AdService] Reset complete');
  }
}

export const AdService = new AdServiceClass();
