import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import Svg, { Path as SvgPath, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Line, Rect, Text as SvgText } from 'react-native-svg';
import { curveBasis, line } from 'd3-shape';
import Animated, { useSharedValue, useAnimatedProps, useDerivedValue, interpolate, withTiming } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH;
const CHART_HEIGHT = 140;
const CHART_MARGIN = 15;
const SAMPLES = 60; // одинаковое число точек для любого периода

export type Period = '24h' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface DataPoint { date: number; value: number; }
interface BalanceChartProps { data?: DataPoint[]; }

// === helpers ===
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const resampleToFixed = (series: DataPoint[], samples = SAMPLES): DataPoint[] => {
  if (!series || series.length === 0) return [];
  const sorted = [...series].sort((a, b) => a.date - b.date);
  const start = sorted[0].date;
  const end = sorted[sorted.length - 1].date;
  if (end === start) return Array.from({ length: samples }, (_, i) => ({ date: start + i, value: sorted[0].value }));
  const out: DataPoint[] = [];
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const targetTime = Math.round(lerp(start, end, t));
    while (j < sorted.length - 2 && sorted[j + 1].date < targetTime) j++;
    const a = sorted[j];
    const b = sorted[j + 1] ?? sorted[j];
    const span = b.date - a.date;
    const localT = span > 0 ? (targetTime - a.date) / span : 0;
    const value = lerp(a.value, b.value, Math.min(Math.max(localT, 0), 1));
    out.push({ date: targetTime, value });
  }
  return out;
};

const formatDate = (timestamp: number, period: Period): string => {
  const date = new Date(timestamp);
  switch (period) {
    case '24h': return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    case '1W':  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    case '1M':
    case '3M':  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    case '1Y':
    case 'ALL': return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
    default:    return date.toLocaleDateString('ru-RU');
  }
};

const AnimatedPath = Animated.createAnimatedComponent(SvgPath);

export const BalanceChart: React.FC<BalanceChartProps> = ({ data: externalData }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { formatAmount, defaultCurrency } = useCurrency();
  const { transactions, accounts } = useData();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1W');
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  // Пульсация для последней точки — оставим без reanimated (нет мерцания)
  const [pulseScale, setPulseScale] = useState(1);
  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setPulseScale(prev => {
        if (growing) { if (prev >= 2.0) { growing = false; return prev - 0.05; } return prev + 0.05; }
        else { if (prev <= 1) { growing = true; return prev + 0.05; } return prev - 0.05; }
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Баланс по транзакциям (точечный график)
  const realBalanceData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      // Если нет транзакций, показываем нулевой баланс
      return [
        { date: Date.now() - 1000, value: 0 },
        { date: Date.now(), value: 0 }
      ];
    }

    const now = Date.now();
    let startDate: number = now;

    // Определяем начальную дату периода
    switch (selectedPeriod) {
      case '24h': startDate = now - 24 * 60 * 60 * 1000; break;
      case '1W': startDate = now - 7 * 24 * 60 * 60 * 1000; break;
      case '1M': startDate = now - 30 * 24 * 60 * 60 * 1000; break;
      case '3M': startDate = now - 90 * 24 * 60 * 60 * 1000; break;
      case '1Y': startDate = now - 365 * 24 * 60 * 60 * 1000; break;
      case 'ALL': {
        const oldest = transactions.reduce((oldest, t) => {
          const d = typeof t.date === 'string' ? new Date(t.date).getTime() : t.date;
          return d < oldest ? d : oldest;
        }, now);
        startDate = oldest - 60 * 60 * 1000; // начинаем за час до первой транзакции
        break;
      }
    }

    // Сортируем ВСЕ транзакции по дате
    const allSortedTransactions = [...transactions].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date;
      return dateA - dateB;
    });

    // Вычисляем начальный баланс
    let currentBalance = 0;

    // 1. Добавляем начальные балансы счетов, созданных ДО начала периода
    if (accounts) {
      for (const account of accounts) {
        const accountCreatedAt = typeof account.createdAt === 'string'
          ? new Date(account.createdAt).getTime()
          : account.createdAt;

        // Если счет создан до начала периода и включен в общий баланс
        if (accountCreatedAt < startDate && account.isIncludedInTotal !== false) {
          // Вычисляем начальный баланс счета = текущий баланс - все транзакции по этому счету
          let accountInitialBalance = account.balance;

          for (const transaction of allSortedTransactions) {
            if (transaction.accountId === account.id) {
              if (transaction.type === 'income') {
                accountInitialBalance -= transaction.amount;
              } else if (transaction.type === 'expense') {
                accountInitialBalance += transaction.amount;
              }
            }
          }

          currentBalance += accountInitialBalance;
        }
      }
    }

    // 2. Добавляем транзакции ДО начала периода
    for (const transaction of allSortedTransactions) {
      const tDate = typeof transaction.date === 'string' ? new Date(transaction.date).getTime() : transaction.date;
      if (tDate < startDate) {
        if (transaction.type === 'income') {
          currentBalance += transaction.amount;
        } else if (transaction.type === 'expense') {
          currentBalance -= transaction.amount;
        }
      }
    }

    // Фильтруем только транзакции в выбранном периоде
    const periodTransactions = allSortedTransactions.filter(t => {
      const tDate = typeof t.date === 'string' ? new Date(t.date).getTime() : t.date;
      return tDate >= startDate && tDate <= now;
    });

    // Получаем счета, созданные В периоде
    const periodAccounts = accounts ? accounts.filter(account => {
      const accountCreatedAt = typeof account.createdAt === 'string'
        ? new Date(account.createdAt).getTime()
        : account.createdAt;
      return accountCreatedAt >= startDate && accountCreatedAt <= now && account.isIncludedInTotal !== false;
    }) : [];

    // Объединяем транзакции и создания счетов, сортируем по времени
    type TimelineEvent =
      | { type: 'transaction'; data: typeof periodTransactions[0]; timestamp: number }
      | { type: 'account'; data: typeof periodAccounts[0]; timestamp: number };

    const timelineEvents: TimelineEvent[] = [
      ...periodTransactions.map(t => ({
        type: 'transaction' as const,
        data: t,
        timestamp: typeof t.date === 'string' ? new Date(t.date).getTime() : t.date
      })),
      ...periodAccounts.map(a => ({
        type: 'account' as const,
        data: a,
        timestamp: typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt
      }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    // Создаем точки для графика
    const balanceData: DataPoint[] = [];

    // Добавляем начальную точку с балансом на начало периода
    balanceData.push({
      date: startDate,
      value: Math.max(0, currentBalance)
    });

    // Обрабатываем все события (транзакции и создания счетов)
    timelineEvents.forEach((event, index) => {
      if (event.type === 'transaction') {
        const transaction = event.data;
        const transactionTimestamp = typeof transaction.date === 'string'
          ? new Date(transaction.date).getTime()
          : transaction.date;

        // Точка ПЕРЕД транзакцией (держим предыдущий баланс)
        if (index > 0 || currentBalance !== 0) {
          balanceData.push({
            date: transactionTimestamp - 1,
            value: Math.max(0, currentBalance)
          });
        }

        // Обновляем баланс
        if (transaction.type === 'income') {
          currentBalance += transaction.amount;
        } else if (transaction.type === 'expense') {
          currentBalance -= transaction.amount;
        }

        // Точка ПОСЛЕ транзакции (новый баланс)
        balanceData.push({
          date: transactionTimestamp,
          value: Math.max(0, currentBalance)
        });
      } else if (event.type === 'account') {
        const account = event.data;
        const accountTimestamp = typeof account.createdAt === 'string'
          ? new Date(account.createdAt).getTime()
          : account.createdAt;

        // Точка ПЕРЕД созданием счета
        if (index > 0 || currentBalance !== 0) {
          balanceData.push({
            date: accountTimestamp - 1,
            value: Math.max(0, currentBalance)
          });
        }

        // Вычисляем начальный баланс счета = текущий баланс - все транзакции по этому счету
        let accountInitialBalance = account.balance;

        for (const transaction of allSortedTransactions) {
          if (transaction.accountId === account.id) {
            if (transaction.type === 'income') {
              accountInitialBalance -= transaction.amount;
            } else if (transaction.type === 'expense') {
              accountInitialBalance += transaction.amount;
            }
          }
        }

        // Добавляем начальный баланс счета
        currentBalance += accountInitialBalance;

        // Точка ПОСЛЕ создания счета (с его начальным балансом)
        balanceData.push({
          date: accountTimestamp,
          value: Math.max(0, currentBalance)
        });
      }
    });

    // Добавляем финальную точку на текущий момент (держим последний баланс)
    if (timelineEvents.length > 0) {
      balanceData.push({
        date: now,
        value: Math.max(0, currentBalance)
      });
    }

    // Логирование для отладки
    console.log('📊 [BalanceChart] Данные графика (точечный):', {
      период: selectedPeriod,
      точек: balanceData.length,
      транзакцийВПериоде: periodTransactions.length,
      счетовВПериоде: periodAccounts.length,
      всегоСобытий: timelineEvents.length,
      начальныйБаланс: balanceData[0]?.value,
      конечныйБаланс: balanceData[balanceData.length - 1]?.value,
    });

    return balanceData.length > 0 ? balanceData : [];
  }, [transactions, accounts, selectedPeriod]);

  const rawData = useMemo(() => (externalData ? externalData : realBalanceData || []), [externalData, realBalanceData]);

  // === Shareables (никаких рефов в worklets) ===
  const prevPts = useSharedValue<{ x: number; y: number }[]>([]);
  const currPts = useSharedValue<{ x: number; y: number }[]>([]);
  const bottomYSV = useSharedValue(CHART_HEIGHT - CHART_MARGIN);
  const morphProgress = useSharedValue(1); // 0..1

  // Display → используем исходные точки транзакций без пересэмплирования
  const displaySeries = useMemo(() => (rawData && rawData.length ? rawData : []), [rawData]);
  // Отключаем пересэмплирование для точечного графика, чтобы сохранить точные значения
  const sampledSeries = useMemo(() => displaySeries, [displaySeries]);

  // Scaling + points (JS)
  const { pointsNow, scaleX, scaleY, bottomY } = useMemo(() => {
    const data = sampledSeries;
    if (!data.length) {
      return { pointsNow: [] as { x: number; y: number; originalData: DataPoint }[], scaleX: (i:number)=>CHART_MARGIN, scaleY:(v:number)=>CHART_HEIGHT-CHART_MARGIN, bottomY: CHART_HEIGHT-CHART_MARGIN };
    }

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    let minValCalc: number;
    let maxValCalc: number;
    if (max === 0 && min === 0) {
      minValCalc = -100;
      maxValCalc = 500;
    } else {
      const padding = (max - min) > 0 ? (max - min) * 0.15 : 100;
      minValCalc = min - padding;
      maxValCalc = max + padding;
      if (min >= 0 && min < 100) minValCalc = -50;
    }

    const sx = (i:number)=> CHART_MARGIN + (i / (data.length - 1)) * (CHART_WIDTH - 2 * CHART_MARGIN);
    const sy = (value:number)=> CHART_HEIGHT - CHART_MARGIN - ((value - minValCalc) / (maxValCalc - minValCalc)) * (CHART_HEIGHT - 2 * CHART_MARGIN);

    const pts = data.map((d, i) => ({
      x: sx(i),
      y: sy(d.value),
      originalData: d
    }));

    return { pointsNow: pts, scaleX: sx, scaleY: sy, bottomY: CHART_HEIGHT - CHART_MARGIN };
  }, [sampledSeries]);

  useEffect(()=>{ bottomYSV.value = bottomY; }, [bottomY]);

  // Синхронизируем JS → shareables и анимируем
  useEffect(() => {
    if (!pointsNow.length) return;
    const snapshot = pointsNow.map(p => ({ x: p.x, y: p.y }));
    if (currPts.value.length === 0) {
      currPts.value = snapshot;
      prevPts.value = snapshot;
      morphProgress.value = 1;
    } else {
      // НЕ запускаем никакой opacity/fade — только морф пути
      prevPts.value = currPts.value.slice();
      currPts.value = snapshot;
      morphProgress.value = 0;
      morphProgress.value = withTiming(1, { duration: 450 });
    }
  }, [pointsNow]);

  // Worklet builders
  const buildLinearPath = (pts: { x: number; y: number }[]) => {
    'worklet';
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i=1;i<pts.length;i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    return d;
  };
  const buildLinearArea = (pts: { x: number; y: number }[], bottomYVal: number) => {
    'worklet';
    if (!pts.length) return '';
    const first = pts[0]; const last = pts[pts.length-1];
    let d = `M ${first.x} ${first.y}`;
    for (let i=1;i<pts.length;i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    d += ` L ${last.x} ${bottomYVal} L ${first.x} ${bottomYVal} Z`;
    return d;
  };

  // Финальные красивые пути для state=1 (curveBasis)
  const finalLine = useMemo(() => {
    const lg = line<{x:number;y:number}>().x(d=>d.x).y(d=>d.y).curve(curveBasis);
    return pointsNow.length ? (lg(pointsNow) || '') : '';
  }, [pointsNow]);
  const finalArea = useMemo(() => {
    if (!pointsNow.length) return '';
    const lg = line<{x:number;y:number}>().x(d=>d.x).y(d=>d.y).curve(curveBasis);
    const base = lg(pointsNow) || '';
    const first = pointsNow[0]; const last = pointsNow[pointsNow.length-1];
    return `${base} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pointsNow, bottomY]);

  // Синхронные анимированные d для линии и заливки без мигания
  const animatedD = useDerivedValue(() => {
    const prev = prevPts.value; const now = currPts.value; const t = morphProgress.value;
    if (!prev.length || !now.length || t === 1) return finalLine;
    const n = Math.min(prev.length, now.length);
    const interp = new Array(n).fill(0).map((_,i)=>({ x: interpolate(t,[0,1],[prev[i].x, now[i].x]), y: interpolate(t,[0,1],[prev[i].y, now[i].y]) }));
    return buildLinearPath(interp);
  });
  const animatedAreaD = useDerivedValue(() => {
    const prev = prevPts.value; const now = currPts.value; const t = morphProgress.value;
    if (!prev.length || !now.length || t === 1) return finalArea;
    const n = Math.min(prev.length, now.length);
    const interp = new Array(n).fill(0).map((_,i)=>({ x: interpolate(t,[0,1],[prev[i].x, now[i].x]), y: interpolate(t,[0,1],[prev[i].y, now[i].y]) }));
    return buildLinearArea(interp, bottomYSV.value);
  });

  const animatedPathProps = useAnimatedProps(()=>({ d: animatedD.value }));
  const animatedAreaProps = useAnimatedProps(()=>({ d: animatedAreaD.value }));

  // Touch
  const handleTouch = useCallback((x: number) => {
    if (pointsNow.length === 0) return;

    // Ограничиваем X координату границами графика
    const minX = pointsNow[0].x;
    const maxX = pointsNow[pointsNow.length - 1].x;
    const clampedX = Math.max(minX, Math.min(maxX, x));

    // Находим два ближайших соседних точки
    let leftPoint = pointsNow[0];
    let rightPoint = pointsNow[pointsNow.length - 1];

    for (let i = 0; i < pointsNow.length - 1; i++) {
      if (pointsNow[i].x <= clampedX && pointsNow[i + 1].x >= clampedX) {
        leftPoint = pointsNow[i];
        rightPoint = pointsNow[i + 1];
        break;
      }
    }

    // Интерполируем Y координату на кривой
    let interpolatedY: number;
    let selectedData: DataPoint;

    if (leftPoint.x === rightPoint.x) {
      // Если точки совпадают (крайний случай)
      interpolatedY = leftPoint.y;
      selectedData = leftPoint.originalData;
    } else {
      // Линейная интерполяция между двумя точками
      const t = (clampedX - leftPoint.x) / (rightPoint.x - leftPoint.x);
      interpolatedY = leftPoint.y + t * (rightPoint.y - leftPoint.y);

      // Выбираем ближайшую точку для отображения данных
      const distToLeft = Math.abs(clampedX - leftPoint.x);
      const distToRight = Math.abs(clampedX - rightPoint.x);
      selectedData = distToLeft < distToRight ? leftPoint.originalData : rightPoint.originalData;
    }

    setTouchPosition({ x: clampedX, y: interpolatedY });
    setSelectedPoint(selectedData);
  }, [pointsNow]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderMove:  (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderRelease: () => { setTouchPosition(null); setSelectedPoint(null); },
  }), [handleTouch]);

  // Переключение периода БЕЗ opacity-анимаций (чтобы не мигало)
  const handlePeriodChange = (period: Period) => {
    // Сначала снапшотим текущие точки в prev, чтобы не было промежуточного состояния
    if (currPts.value.length) {
      prevPts.value = currPts.value.slice();
      morphProgress.value = 0; // подготовка к морфу
    }
    setSelectedPeriod(period);
    setSelectedPoint(null);
    setTouchPosition(null);
  };

  const periods: Period[] = ['24h','1W','1M','3M','1Y','ALL'];

  // Tooltip helpers
  const balanceChange = useMemo(() => {
    if (!selectedPoint || !rawData || rawData.length < 2) return null;
    const idx = rawData.findIndex(d => d.date === selectedPoint.date && d.value === selectedPoint.value);
    if (idx <= 0) return null;
    return selectedPoint.value - rawData[idx - 1].value;
  }, [selectedPoint, rawData]);

  const lastPoint = pointsNow.length ? pointsNow[pointsNow.length - 1] : null;
  const isLastPointActive = lastPoint && (!touchPosition || (Math.abs(touchPosition.x - lastPoint.x) < 5 && Math.abs(touchPosition.y - lastPoint.y) < 5));

  const tooltipData = useMemo(() => {
    if (!touchPosition || !selectedPoint) return null;
    const tooltipY = Math.max(touchPosition.y - 50, 5);
    const tooltipText = formatAmount(selectedPoint.value);
    const changeText = balanceChange !== null && balanceChange !== 0 ? (balanceChange > 0 ? `+${formatAmount(balanceChange)}` : formatAmount(balanceChange)) : '';
    const tooltipWidth = Math.max(tooltipText.length * 7 + 16, 80);
    const tooltipX = Math.min(Math.max(touchPosition.x - tooltipWidth / 2, 5), CHART_WIDTH - tooltipWidth - 5);
    return { tooltipY, tooltipText, changeText, tooltipWidth, tooltipX };
  }, [touchPosition, selectedPoint, balanceChange, formatAmount]);

  const displayDate = useMemo(() => {
    if (selectedPoint) return formatDate(selectedPoint.date, selectedPeriod);
    if (rawData && rawData.length) return formatDate(rawData[rawData.length - 1].date, selectedPeriod);
    return formatDate(Date.now(), selectedPeriod);
  }, [selectedPoint, rawData, selectedPeriod]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('accounts.balanceDynamics') || 'Динамика баланса'}</Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
      </View>

      {/* НИКАКОГО opacity-мерцания */}
      <View style={styles.chartContainer}>
        <View {...panResponder.panHandlers} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Defs>
              <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.6" />
              </SvgLinearGradient>
              <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={isDark ? '#FF8C42' : '#4A90E2'} stopOpacity="0.4" />
                <Stop offset="80%" stopColor={isDark ? '#FF8C42' : '#4A90E2'} stopOpacity="0.05" />
                <Stop offset="100%" stopColor={isDark ? '#FF8C42' : '#4A90E2'} stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>

            {/* Анимируемая заливка */}
            <AnimatedPath animatedProps={animatedAreaProps} fill="url(#areaGradient)" />

            {/* Линия нуля */}
            {(() => { const zeroY = pointsNow.length ? scaleY(0) : null; return (zeroY !== null && zeroY >= CHART_MARGIN && zeroY <= CHART_HEIGHT - CHART_MARGIN) ? (
              <Line x1={CHART_MARGIN} y1={zeroY} x2={CHART_WIDTH - CHART_MARGIN} y2={zeroY} stroke={colors.border} strokeWidth="1" strokeDasharray="5,5" opacity="0.5" />
            ) : null; })()}

            {/* Анимируемая линия */}
            <AnimatedPath animatedProps={animatedPathProps} stroke="url(#lineGradient)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Последняя точка */}
            {lastPoint && (!touchPosition || isLastPointActive) && (
              <>
                {isLastPointActive && (<Circle cx={lastPoint.x} cy={lastPoint.y} r={8 * pulseScale} fill={colors.primary} opacity={0.3 / pulseScale} />)}
                <Circle cx={lastPoint.x} cy={lastPoint.y} r="8" fill={colors.primary} opacity="0.8" />
                <Circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={colors.card} />
              </>
            )}

            {/* Tooltip */}
            {touchPosition && selectedPoint && tooltipData && (
              <>
                <Line x1={touchPosition.x} y1={touchPosition.y} x2={touchPosition.x} y2={Math.max(touchPosition.y - 40, 10)} stroke={colors.primary} strokeWidth="2" />
                <Circle cx={touchPosition.x} cy={touchPosition.y} r="8" fill={colors.primary} opacity="0.8" />
                <Circle cx={touchPosition.x} cy={touchPosition.y} r="4" fill={colors.card} />
                <Rect x={tooltipData.tooltipX} y={tooltipData.tooltipY} width={tooltipData.tooltipWidth} height={tooltipData.changeText ? 38 : 24} rx="6" ry="6" fill={colors.primary} opacity="0.95" />
                <SvgText x={tooltipData.tooltipX + tooltipData.tooltipWidth / 2} y={tooltipData.tooltipY + 16} fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">{tooltipData.tooltipText}</SvgText>
                {tooltipData.changeText ? (<SvgText x={tooltipData.tooltipX + tooltipData.tooltipWidth / 2} y={tooltipData.tooltipY + 31} fill={balanceChange! > 0 ? '#FFFFFF' : '#FFE5E5'} fontSize="10" fontWeight="600" textAnchor="middle">{tooltipData.changeText}</SvgText>) : null}
              </>
            )}
          </Svg>
        </View>
      </View>

      <View style={styles.periodSelector}>
        {(['24h','1W','1M','3M','1Y','ALL'] as Period[]).map((period) => (
          <TouchableOpacity key={period} style={[styles.periodButton, { backgroundColor: selectedPeriod === period ? colors.primary : 'transparent' }]} onPress={() => handlePeriodChange(period)}>
            <Text style={[styles.periodText, { color: selectedPeriod === period ? '#FFFFFF' : colors.text, fontWeight: selectedPeriod === period ? '600' : '400' }]}>{period}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 32 },
  header: { marginBottom: 8, marginHorizontal: 16 },
  title: { fontSize: 14, fontWeight: '600' },
  dateText: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  chartContainer: { alignItems: 'center', marginBottom: 16 },
  periodSelector: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginHorizontal: 16 },
  periodButton: { flex: 1, paddingVertical: 6, paddingHorizontal: 3, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: 11 },
});
