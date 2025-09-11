import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Appearance,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import * as ExpoSplashScreen from 'expo-splash-screen';

/* ===== ПАЛИТРЫ (HEX) ===== */
const LIGHT_BG: [string, string] = ["#EAF4FF", "#BFD6FF"]; // светлый фон экрана
const DARK_BG: [string, string]  = ["#0B1220", "#111A2E"]; // тёмный фон экрана

const BLUE_TILE: [string, string]   = ["#D1ECFF", "#4CA7FF"]; // плитка — голубой
const ORANGE_TILE: [string, string] = ["#FFE5A6", "#FF9D2E"]; // плитка — оранжевый

// прогресс-бар / спиннер: цвета под синий/оранжевый
const PROGRESS_TRACK_BLUE   = "#CFE6FF";
const PROGRESS_FILL_BLUE    = "#2E6AD6";
const PROGRESS_TRACK_ORANGE = "#FFE0C2";
const PROGRESS_FILL_ORANGE  = "#FF9D2E";

// подписи под светлый/тёмный фон
const CAPTION_LIGHT  = "#314969";
const CAPTION_DARK   = "#C9D4F1";

// неоморфные «свет/тень» у плитки
const TILE_SHADOW = "rgba(0,23,58,0.35)";
const HILITE      = "rgba(255,255,255,0.85)";
const INNER_DARK  = "rgba(0,0,0,0.18)";

export const SplashScreen: React.FC = () => {
  const DURATION_MS = 10000; // 10 секунд
  const [leftSec, setLeftSec] = useState(DURATION_MS / 1000);
  const [isReady, setIsReady] = useState(false);
  
  // Определяем системную тему
  const [systemIsDark, setSystemIsDark] = useState(() => {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark';
  });

  // Анимация появления для предотвращения моргания
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Определяем язык устройства для отображения правильного текста
  const deviceLanguage = Localization.locale?.split('-')[0] || 'en';
  
  // Словарь тагланов для всех поддерживаемых языков
  const loadingTexts: Record<string, string> = {
    en: 'Loading data…',
    ru: 'Загружаем данные…',
    kk: 'Деректер жүктелуде…',
    uk: 'Завантажуємо дані…',
    zh: '正在加载数据…',
    ar: 'تحميل البيانات…',
    de: 'Lade Daten…',
    fr: 'Chargement des données…',
    hi: 'डेटा लोड हो रहा है…',
    tr: 'Veriler yükleniyor…',
    el: 'Φόρτωση δεδομένων…',
    it: 'Caricamento dati…',
    pl: 'Ładowanie danych…',
  };
  
  // Используем текст для языка устройства или английский по умолчанию
  const loadingText = loadingTexts[deviceLanguage] || loadingTexts.en;

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

  useEffect(() => {
    if (!isReady) return;
    
    let interval: NodeJS.Timeout;
    const t0 = Date.now();
    
    interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((DURATION_MS - (Date.now() - t0)) / 1000));
      setLeftSec(left);
    }, 200);

    return () => clearInterval(interval);
  }, [isReady]);

  const progress = 1 - leftSec / (DURATION_MS / 1000); // 0..1
  const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
  const ss = String(leftSec % 60).padStart(2, "0");

  /* --- фон: свет↔тёмный (кроссфейд), завершение на системной теме --- */
  const themeT = useRef(new Animated.Value(0)).current; // 0 — LIGHT, 1 — DARK
  useEffect(() => {
    if (!isReady) return;
    
    const FADE_MS = 2600;
    const FINAL_DELAY = 1000; // Задержка перед финальной анимацией
    
    // Сначала циклическая анимация
    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(themeT, { toValue: 1, duration: FADE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(themeT, { toValue: 0, duration: FADE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ])
    );
    
    loopAnimation.start();
    
    // За 1 секунду до конца останавливаем цикл и переходим к нужной теме
    const finalTimer = setTimeout(() => {
      loopAnimation.stop();
      Animated.timing(themeT, {
        toValue: systemIsDark ? 1 : 0,
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, DURATION_MS - FINAL_DELAY);
    
    return () => {
      clearTimeout(finalTimer);
      loopAnimation.stop();
    };
  }, [systemIsDark, isReady]);
  
  const lightOpacity = themeT.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity  = themeT.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  /* --- плитка: дыхание и синий↔оранжевый --- */
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isReady) return;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [isReady]);

  const colorT = useRef(new Animated.Value(0)).current; // 0..1
  useEffect(() => {
    if (!isReady) return;
    
    const D = 2600;
    const FINAL_DELAY = 1000;
    
    // Циклическая анимация цветов
    const colorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(colorT, { toValue: 1, duration: D, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(colorT, { toValue: 0, duration: D, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ])
    );
    
    colorLoop.start();
    
    // За 1 секунду до конца фиксируем цвет (синий для светлой темы, оранжевый для темной)
    const colorTimer = setTimeout(() => {
      colorLoop.stop();
      Animated.timing(colorT, {
        toValue: systemIsDark ? 1 : 0, // 0 = синий, 1 = оранжевый
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, DURATION_MS - FINAL_DELAY);
    
    return () => {
      clearTimeout(colorTimer);
      colorLoop.stop();
    };
  }, [systemIsDark, isReady]);
  
  const blueOpacity   = colorT.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const orangeOpacity = colorT.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Если компонент не готов, показываем прозрачный фон с тем же цветом, что и нативный splash
  if (!isReady) {
    return (
      <View style={[styles.loader, { backgroundColor: systemIsDark ? '#0B1220' : '#EAF4FF' }]} />
    );
  }

  return (
    <Animated.View style={[styles.loader, { opacity: fadeInAnim }]}>
      {/* Фон — два слоя градиентов */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: lightOpacity }]} pointerEvents="none">
        <LinearGradient colors={LIGHT_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: darkOpacity }]} pointerEvents="none">
        <LinearGradient colors={DARK_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Центр: плитка + логотип */}
      <View style={styles.hero}>
        {/* Плитка под логотипом */}
        <Animated.View
          style={[
            styles.tile,
            {
              transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.06] }) }],
              ...Platform.select({ android: { elevation: 8 } }), // ниже логотипа
            },
          ]}
        >
          {/* голубой градиент */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: blueOpacity }]} pointerEvents="none">
            <LinearGradient colors={BLUE_TILE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          {/* оранжевый градиент */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: orangeOpacity }]} pointerEvents="none">
            <LinearGradient colors={ORANGE_TILE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>

          {/* неоморфные «блики» */}
          <LinearGradient colors={[HILITE, "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topHilite} pointerEvents="none" />
          <LinearGradient colors={[INNER_DARK, "rgba(0,0,0,0)"]} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={styles.bottomInnerShadow} pointerEvents="none" />
        </Animated.View>

        {/* ЛОГОТИП — сверху */}
        <Image
          source={require("../../assets/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* СПИННЕР: меняет цвет синхронно с плиткой */}
      <View style={styles.centerRow}>
        <Animated.View style={[styles.centerOverlay, { opacity: blueOpacity }]}>
          <ActivityIndicator size="large" color={PROGRESS_FILL_BLUE} />
        </Animated.View>
        <Animated.View style={[styles.centerOverlay, { opacity: orangeOpacity }]}>
          <ActivityIndicator size="large" color={PROGRESS_FILL_ORANGE} />
        </Animated.View>
      </View>

      {/* Прогресс-бар: меняет цвет синхронно с плиткой */}
      <View style={styles.progressTrackWrap}>
        <Animated.View style={[styles.progressTrack, { backgroundColor: PROGRESS_TRACK_BLUE, opacity: blueOpacity }]} />
        <Animated.View style={[styles.progressTrack, { backgroundColor: PROGRESS_TRACK_ORANGE, opacity: orangeOpacity, position: "absolute" }]} />

        <View style={styles.progressFillLayer}>
          <Animated.View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: PROGRESS_FILL_BLUE, opacity: blueOpacity }]} />
          <Animated.View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: PROGRESS_FILL_ORANGE, opacity: orangeOpacity, position: "absolute" }]} />
        </View>
      </View>

      {/* Подпись: светлая/тёмная */}
      <View style={styles.centerRow}>
        <Animated.Text style={[styles.caption, { color: CAPTION_LIGHT, opacity: lightOpacity }]}>
          {loadingText} {mm}:{ss}
        </Animated.Text>
        <Animated.Text style={[styles.caption, { color: CAPTION_DARK, opacity: darkOpacity, position: "absolute" }]}>
          {loadingText} {mm}:{ss}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

/* ===== СТИЛИ ===== */
const TILE_SIZE = 200;
const RADIUS = 100;

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  tile: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    borderRadius: RADIUS,
    shadowColor: TILE_SHADOW,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 18 },
    overflow: "hidden",
    zIndex: 0,
  },

  topHilite: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS, opacity: 0.6 },
  bottomInnerShadow: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS, opacity: 0.6 },

  logo: { width: TILE_SIZE * 0.7, height: TILE_SIZE * 0.7, zIndex: 2 },

  centerRow: { height: 36, alignItems: "center", justifyContent: "center", marginTop: 8 },
  centerOverlay: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },

  // Прогресс-бар с двумя слоями
  progressTrackWrap: { width: TILE_SIZE, height: 10, marginTop: 14, position: "relative" },
  progressTrack: { width: "100%", height: "100%", borderRadius: 999 },
  progressFillLayer: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden", borderRadius: 999 },
  progressFill: { height: "100%", borderRadius: 999 },

  caption: { fontSize: 14, fontWeight: "600" },
}); 