import { useState, useEffect, useCallback } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AdMobConfig } from '../config/admob.config';
import { AdService } from '../services/AdService';

export interface AdReward {
  type: string;
  amount: number;
}

/**
 * Хук для работы с рекламой с вознаграждением (Rewarded Ad)
 *
 * @param onRewarded - Callback, вызываемый при получении награды
 *
 * @example
 * const { showAd, isLoaded } = useRewardedAd((reward) => {
 *   console.log('Награда получена:', reward);
 *   // Выдать награду пользователю
 * });
 *
 * <Button title="Смотреть и получить награду" onPress={showAd} disabled={!isLoaded} />
 */
export const useRewardedAd = (onRewarded?: (reward: AdReward) => void) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [adInstance, setAdInstance] = useState<RewardedAd | null>(null);

  useEffect(() => {
    // Создаем экземпляр рекламы
    const rewarded = RewardedAd.createForAdRequest(AdMobConfig.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });

    setAdInstance(rewarded);

    // Подписываемся на события
    const loadedListener = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[RewardedAd] Ad loaded');
      setIsLoaded(true);
      setIsLoading(false);
    });

    const earnedRewardListener = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('[RewardedAd] Reward earned:', reward);

        if (onRewarded) {
          onRewarded(reward);
        }

        // После получения награды сбрасываем состояния и загружаем следующую рекламу
        setIsLoaded(false);
        setIsShowing(false);
        setIsLoading(true);

        // Небольшая задержка перед загрузкой следующей рекламы
        setTimeout(() => {
          rewarded.load();
        }, 1000);
      }
    );

    // Загружаем рекламу
    setIsLoading(true);
    rewarded.load();

    return () => {
      loadedListener();
      earnedRewardListener();
    };
  }, [onRewarded]);

  /**
   * Показать рекламу с вознаграждением
   */
  const showAd = useCallback(async () => {
    if (!isLoaded || !adInstance) {
      console.log('[RewardedAd] Ad not loaded yet');
      return false;
    }

    if (isShowing) {
      console.log('[RewardedAd] Ad is already showing');
      return false;
    }

    try {
      setIsShowing(true);
      await adInstance.show();
      console.log('[RewardedAd] Ad shown successfully');
      return true;
    } catch (error) {
      console.error('[RewardedAd] Show error:', error);
      setIsShowing(false);
      return false;
    }
  }, [isLoaded, isShowing, adInstance]);

  return {
    showAd,
    isLoaded,
    isLoading,
    isShowing,
  };
};

/**
 * Хук для награды "Отключить рекламу на 20 минут"
 *
 * @example
 * const { showAdForNoAds, isLoaded } = useRewardedAdForNoAds();
 *
 * <Button
 *   title="Смотреть видео и отключить рекламу на 20 мин"
 *   onPress={showAdForNoAds}
 *   disabled={!isLoaded}
 * />
 */
export const useRewardedAdForNoAds = () => {
  const handleReward = useCallback(async (reward: AdReward) => {
    console.log('[RewardedAd] No-ads reward earned');

    // Активируем период без рекламы на 20 минут (0.333 часа)
    await AdService.activateAdFree(0.333);

    // Можно показать уведомление пользователю
    console.log('✅ Реклама отключена на 20 минут!');
  }, []);

  const {
    showAd: originalShowAd,
    isLoaded,
    isLoading,
    isShowing,
  } = useRewardedAd(handleReward);

  const showAdForNoAds = useCallback(async () => {
    const shown = await originalShowAd();
    return shown;
  }, [originalShowAd]);

  return {
    showAdForNoAds,
    isLoaded,
    isLoading,
    isShowing,
  };
};

/**
 * Хук для награды "Разблокировать 3-й счет"
 *
 * Используется для рекламного блока Rewarded_ProUnlock
 * ID: ca-app-pub-8853061795959758/6188146193
 *
 * Бесплатные пользователи имеют 2 счета.
 * Просмотр видео разблокирует 3-й счет навсегда.
 *
 * @example
 * const { unlockThirdAccountWithAd, isLoaded, isLoading } = useRewardedAdForThirdAccount();
 *
 * <Button
 *   title="Смотреть видео и разблокировать 3-й счет"
 *   onPress={unlockThirdAccountWithAd}
 *   disabled={!isLoaded}
 * />
 */
export const useRewardedAdForThirdAccount = (
  onSuccess?: () => void,
  onError?: (error: string) => void
) => {
  const handleReward = useCallback(async (reward: AdReward) => {
    console.log('[RewardedAd] Third account unlock reward earned:', reward);

    try {
      // Разблокируем 3-й счет
      await AdService.unlockThirdAccount();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[RewardedAd] Error unlocking third account:', error);
      if (onError) {
        onError('Ошибка разблокировки 3-го счета. Попробуйте снова.');
      }
    }
  }, [onSuccess, onError]);

  const {
    showAd: originalShowAd,
    isLoaded,
    isLoading,
    isShowing,
  } = useRewardedAd(handleReward);

  const unlockThirdAccountWithAd = useCallback(async () => {
    const shown = await originalShowAd();
    return shown;
  }, [originalShowAd]);

  return {
    unlockThirdAccountWithAd,
    isLoaded,
    isLoading,
    isShowing,
  };
};
