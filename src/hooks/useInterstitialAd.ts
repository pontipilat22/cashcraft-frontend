import { useState, useEffect } from 'react';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';
import { AdMobConfig } from '../config/admob.config';
import { AdService } from '../services/AdService';

/**
 * Хук для работы с межстраничной рекламой (Interstitial Ad)
 *
 * @example
 * const { showAd, isLoaded, isLoading } = useInterstitialAd();
 *
 * // При определенном действии
 * if (isLoaded) {
 *   showAd();
 * }
 */
export const useInterstitialAd = () => {
  const { isPremium } = useSubscription();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adInstance, setAdInstance] = useState<InterstitialAd | null>(null);

  useEffect(() => {
    // Создаем экземпляр рекламы
    const interstitial = InterstitialAd.createForAdRequest(AdMobConfig.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });

    setAdInstance(interstitial);

    // Подписываемся на события
    const loadedListener = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[InterstitialAd] Ad loaded');
      setIsLoaded(true);
      setIsLoading(false);
    });

    const errorListener = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('[InterstitialAd] Load error:', error);
      setIsLoaded(false);
      setIsLoading(false);
    });

    const closedListener = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[InterstitialAd] Ad closed');
      setIsLoaded(false);

      // Загружаем следующую рекламу
      if (!isPremium) {
        setIsLoading(true);
        interstitial.load();
      }
    });

    // Загружаем рекламу для неподписчиков
    if (!isPremium) {
      setIsLoading(true);
      interstitial.load();
    }

    return () => {
      loadedListener();
      errorListener();
      closedListener();
    };
  }, [isPremium]);

  /**
   * Показать межстраничную рекламу
   */
  const showAd = async () => {
    // Проверяем подписку
    if (isPremium) {
      console.log('[InterstitialAd] Premium user, ad skipped');
      return;
    }

    // Проверяем, можно ли показать рекламу
    const canShow = await AdService.shouldShowInterstitial(isPremium);
    if (!canShow) {
      console.log('[InterstitialAd] Cannot show yet (cooldown or ad-free period)');
      return;
    }

    // Проверяем, загружена ли реклама
    if (!isLoaded || !adInstance) {
      console.log('[InterstitialAd] Ad not loaded yet');
      return;
    }

    try {
      // Показываем рекламу
      await adInstance.show();

      // Отмечаем показ
      await AdService.markInterstitialShown();

      console.log('[InterstitialAd] Ad shown successfully');
    } catch (error) {
      console.error('[InterstitialAd] Show error:', error);
    }
  };

  /**
   * Отслеживать создание транзакции
   * Вызывайте после создания каждой транзакции
   */
  const trackTransaction = async () => {
    if (!isPremium) {
      await AdService.incrementTransactionCount();

      // Проверяем, пора ли показать рекламу (каждые 6 транзакций)
      const canShow = await AdService.canShowInterstitial();
      if (canShow && isLoaded) {
        await showAd();
      }
    }
  };

  /**
   * Показать рекламу для счета (без проверки счетчика транзакций)
   */
  const showAdForAccount = async () => {
    // Проверяем подписку
    if (isPremium) {
      console.log('[InterstitialAd] Premium user, ad skipped');
      return;
    }

    // Проверяем, загружена ли реклама
    if (!isLoaded || !adInstance) {
      console.log('[InterstitialAd] Ad not loaded yet');
      return;
    }

    try {
      // Показываем рекламу
      await adInstance.show();

      // Отмечаем показ
      await AdService.markInterstitialShown();

      console.log('[InterstitialAd] Ad shown successfully for account');
    } catch (error) {
      console.error('[InterstitialAd] Show error:', error);
    }
  };

  /**
   * Отслеживать создание счета
   * Вызывайте после создания каждого счета
   * Показывает рекламу каждый 3-й счет (3, 6, 9, 12...)
   */
  const trackAccountCreation = async () => {
    if (!isPremium) {
      await AdService.incrementAccountCount();

      // Проверяем, пора ли показать рекламу (каждый 3-й счет)
      const shouldShow = await AdService.shouldShowInterstitialForAccount();
      if (shouldShow && isLoaded) {
        console.log('[InterstitialAd] Showing ad for account creation');
        await showAdForAccount();
      }
    }
  };

  /**
   * Отслеживать переключение вкладок
   * Показывает рекламу один раз в день
   */
  const trackTabSwitch = async () => {
    if (!isPremium) {
      // Проверяем, показывалась ли реклама сегодня
      const shouldShow = await AdService.shouldShowInterstitialForTabSwitch();
      if (shouldShow && isLoaded) {
        console.log('[InterstitialAd] Showing ad for tab switch (once per day)');
        await showAdForAccount(); // Используем тот же метод без проверки транзакций
        await AdService.markTabSwitchAdShown();
      }
    }
  };

  return {
    showAd,
    trackTransaction,
    trackAccountCreation,
    trackTabSwitch,
    isLoaded,
    isLoading,
  };
};
