/**
 * Сервис для отслеживания инициализации AdMob
 * Используется для синхронизации загрузки рекламы с полной инициализацией AdMob SDK
 */
class AdMobInitServiceClass {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private resolveInit: (() => void) | null = null;

  constructor() {
    this.initPromise = new Promise((resolve) => {
      this.resolveInit = resolve;
    });
  }

  /**
   * Отметить AdMob как инициализированный
   * Вызывается после успешного выполнения mobileAds().initialize()
   */
  markAsInitialized() {
    this.initialized = true;
    console.log('✅ [AdMobInitService] AdMob marked as initialized');
    if (this.resolveInit) {
      this.resolveInit();
    }
  }

  /**
   * Ждать завершения инициализации AdMob
   * Возвращает Promise, который резолвится когда AdMob полностью инициализирован
   */
  async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    console.log('⏳ [AdMobInitService] Waiting for AdMob initialization...');
    return this.initPromise;
  }

  /**
   * Проверить, инициализирован ли AdMob
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const AdMobInitService = new AdMobInitServiceClass();
