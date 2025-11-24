import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Appearance,
} from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SpiderWebLoader } from './SpiderWebLoader';

interface SplashScreenProps {
  /** Максимальное время показа в миллисекундах (по умолчанию 10 секунд) */
  maxDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ maxDuration = 10000 }) => {
  const [isReady, setIsReady] = useState(false);

  // Определяем системную тему
  const [systemIsDark] = useState(() => {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark';
  });

  // Анимация появления для предотвращения моргания
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Инициализация с плавным появлением
  useEffect(() => {
    // Небольшая задержка для инициализации
    const initTimer = setTimeout(() => {
      setIsReady(true);
      
      // Плавное появление
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 150);

    return () => clearTimeout(initTimer);
  }, []);


  // Если компонент не готов, показываем прозрачный фон с тем же цветом, что и нативный splash
  if (!isReady) {
    return (
      <View style={[styles.loader, { backgroundColor: systemIsDark ? '#0B1220' : '#EAF4FF' }]} />
    );
  }

  return (
    <Animated.View style={[styles.loader, { opacity: fadeInAnim }]}>
      {/* Iridescence shader — на весь экран */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <SpiderWebLoader isDark={systemIsDark} />
      </View>

      {/* Центр: логотип */}
      <View style={styles.hero}>
        {/* ЛОГОТИП */}
        <Image
          source={require("../../assets/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

    </Animated.View>
  );
};

/* ===== СТИЛИ ===== */
const TILE_SIZE = 200;

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: TILE_SIZE * 0.7, height: TILE_SIZE * 0.7, zIndex: 2 },
}); 