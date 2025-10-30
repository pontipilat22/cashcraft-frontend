import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSubscription } from '../../context/SubscriptionContext';
import { AdMobConfig } from '../../config/admob.config';
import { AdService } from '../../services/AdService';

interface BannerAdProps {
  /**
   * Размер баннера
   * - BANNER: 320x50
   * - LARGE_BANNER: 320x100
   * - MEDIUM_RECTANGLE: 300x250
   * - FULL_BANNER: 468x60
   * - LEADERBOARD: 728x90
   */
  size?: BannerAdSize;

  /**
   * Принудительно скрыть рекламу (например, на важных экранах)
   */
  forceHide?: boolean;
}

/**
 * Компонент баннерной рекламы Google AdMob
 *
 * Автоматически скрывается для Premium пользователей
 * и в период "без рекламы" (после просмотра rewarded видео)
 */
export const BannerAd: React.FC<BannerAdProps> = ({
  size = BannerAdSize.BANNER,
  forceHide = false,
}) => {
  const { isPremium } = useSubscription();
  const [shouldShow, setShouldShow] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    checkIfShouldShow();

    // Проверяем каждую минуту (на случай окончания периода без рекламы)
    const interval = setInterval(checkIfShouldShow, 60 * 1000);

    return () => clearInterval(interval);
  }, [isPremium, forceHide]);

  const checkIfShouldShow = async () => {
    if (forceHide) {
      setShouldShow(false);
      return;
    }

    const should = await AdService.shouldShowBanners(isPremium);
    setShouldShow(should);
  };

  const handleAdLoaded = () => {
    console.log('[BannerAd] Ad loaded successfully');
    setAdLoaded(true);
  };

  const handleAdFailedToLoad = (error: any) => {
    console.error('[BannerAd] Failed to load:', error);
    setAdLoaded(false);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={AdMobConfig.banner}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
});
