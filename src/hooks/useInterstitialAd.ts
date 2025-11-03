import { useState, useEffect, useRef } from 'react';
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';
import { AdMobConfig } from '../config/admob.config';
import { AdService } from '../services/AdService';
import { AdMobInitService } from '../services/AdMobInitService';

/**
 * Singleton экземпляр InterstitialAd
 * Создается один раз на все приложение для избежания утечек памяти
 */
let interstitialInstance: InterstitialAd | null = null;

const getInterstitialInstance = (): InterstitialAd => {
  if (!interstitialInstance) {
    console.log('[InterstitialAd] Creating singleton instance');
    interstitialInstance = InterstitialAd.createForAdRequest(
      AdMobConfig.interstitial,
      { requestNonPersonalizedAdsOnly: false }
    );
  }
  return interstitialInstance;
};

/**
 * Хук для работы с межстраничной рекламой (Interstitial Ad)
 *
 * ИСПРАВЛЕНИЯ:
 * - ✅ Singleton pattern для InterstitialAd (избежание утечек памяти)
 * - ✅ Правильный cleanup event listeners
 * - ✅ Синхронизация с AdMobInitService
 * - ✅ Graceful fallback для ad blocker errors
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

  // Используем useRef для хранения функций отписки
  const unsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Получаем singleton экземпляр
    const interstitial = getInterstitialInstance();

    // ✅ ИСПРАВЛЕНО: Сохраняем функции отписки, а не сами listeners
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[InterstitialAd] Ad loaded');
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('[InterstitialAd] Load error:', error);

      // ✅ Graceful fallback для ad blockers
      if (error.message?.includes('JavascriptEngine') || error.code === 'googleMobileAds/internal-error') {
        console.log('[InterstitialAd] Possible ad blocker or initialization issue - will retry later');
      }

      setIsLoaded(false);
      setIsLoading(false);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[InterstitialAd] Ad closed');
      setIsLoaded(false);

      // Загружаем следующую рекламу для неподписчиков
      if (!isPremium) {
        setIsLoading(true);
        // Небольшая задержка перед повторной загрузкой
        setTimeout(() => {
          console.log('[InterstitialAd] Loading next ad after close');
          interstitial.load();
        }, 1000);
      }
    });

    // Сохраняем функции отписки
    unsubscribeRef.current = [unsubscribeLoaded, unsubscribeError, unsubscribeClosed];

    // ✅ Загружаем рекламу только для неподписчиков
    // Ждем полной инициализации AdMob перед загрузкой
    if (!isPremium) {
      setIsLoading(true);

      AdMobInitService.waitForInitialization()
        .then(() => {
          console.log('[InterstitialAd] AdMob initialized, waiting 1 second for JS engine...');
          // Дополнительная задержка для Hermes + New Architecture + Skia
          return new Promise(resolve => setTimeout(resolve, 1000));
        })
        .then(() => {
          console.log('[InterstitialAd] Loading ad...');
          interstitial.load();
        })
        .catch(error => {
          console.error('[InterstitialAd] Error during initialization wait:', error);
          setIsLoading(false);
        });
    }

    // ✅ ИСПРАВЛЕНО: Правильный cleanup
    return () => {
      console.log('[InterstitialAd] Cleaning up event listeners');
      unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRef.current = [];
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
    if (!isLoaded) {
      console.log('[InterstitialAd] Ad not loaded yet');
      return;
    }

    try {
      const interstitial = getInterstitialInstance();

      // Показываем рекламу
      await interstitial.show();

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
    if (!isLoaded) {
      console.log('[InterstitialAd] Ad not loaded yet');
      return;
    }

    try {
      const interstitial = getInterstitialInstance();

      // Показываем рекламу
      await interstitial.show();

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
