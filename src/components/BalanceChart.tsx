import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Line } from 'react-native-svg';
import { curveBasis, line } from 'd3-shape';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 140;
const CHART_MARGIN = 15;

type Period = '24h' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface DataPoint {
  date: number;
  value: number;
}

interface BalanceChartProps {
  data?: DataPoint[];
}

// Генерация моковых данных для демонстрации
const generateMockData = (period: Period): DataPoint[] => {
  const now = Date.now();
  const data: DataPoint[] = [];

  let points = 24;
  let interval = 60 * 60 * 1000; // 1 час
  let baseValue = 10000;

  switch (period) {
    case '24h':
      points = 24;
      interval = 60 * 60 * 1000;
      break;
    case '1W':
      points = 7;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '1M':
      points = 30;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '3M':
      points = 90;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '1Y':
      points = 12;
      interval = 30 * 24 * 60 * 60 * 1000;
      break;
    case 'ALL':
      points = 24;
      interval = 30 * 24 * 60 * 60 * 1000;
      break;
  }

  for (let i = 0; i < points; i++) {
    const variance = (Math.random() - 0.5) * 2000;
    const trend = i * 50;
    data.push({
      date: now - (points - i) * interval,
      value: baseValue + trend + variance,
    });
  }

  return data;
};

// Форматирование даты в зависимости от периода
const formatDate = (timestamp: number, period: Period): string => {
  const date = new Date(timestamp);

  switch (period) {
    case '24h':
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    case '1W':
      return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    case '1M':
    case '3M':
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    case '1Y':
    case 'ALL':
      return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
    default:
      return date.toLocaleDateString('ru-RU');
  }
};

export const BalanceChart: React.FC<BalanceChartProps> = ({ data: externalData }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { formatAmount, defaultCurrency, convertCurrency } = useCurrency();
  const { transactions, accounts } = useData();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1W');
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  // Вычисляем реальные данные баланса на основе транзакций
  const realBalanceData = useMemo(() => {
    // Если нет транзакций, создаем нулевой график
    if (!transactions || transactions.length === 0) {
      const now = Date.now();
      let points: number;
      let interval: number;

      switch (selectedPeriod) {
        case '24h':
          points = 24;
          interval = 60 * 60 * 1000;
          break;
        case '1W':
          points = 7;
          interval = 24 * 60 * 60 * 1000;
          break;
        case '1M':
          points = 30;
          interval = 24 * 60 * 60 * 1000;
          break;
        case '3M':
          points = 90;
          interval = 24 * 60 * 60 * 1000;
          break;
        case '1Y':
          points = 12;
          interval = 30 * 24 * 60 * 60 * 1000;
          break;
        case 'ALL':
          points = 7;
          interval = 24 * 60 * 60 * 1000;
          break;
        default:
          points = 7;
          interval = 24 * 60 * 60 * 1000;
      }

      const startDate = now - points * interval;
      const zeroData: DataPoint[] = [];

      for (let i = 0; i <= points; i++) {
        zeroData.push({
          date: startDate + i * interval,
          value: 0,
        });
      }

      return zeroData;
    }

    const now = Date.now();
    let startDate: number;
    let points: number;
    let interval: number;

    switch (selectedPeriod) {
      case '24h':
        points = 24;
        interval = 60 * 60 * 1000;
        startDate = now - points * interval;
        break;
      case '1W':
        points = 7;
        interval = 24 * 60 * 60 * 1000;
        startDate = now - points * interval;
        break;
      case '1M':
        points = 30;
        interval = 24 * 60 * 60 * 1000;
        startDate = now - points * interval;
        break;
      case '3M':
        points = 90;
        interval = 24 * 60 * 60 * 1000;
        startDate = now - points * interval;
        break;
      case '1Y':
        points = 12;
        interval = 30 * 24 * 60 * 60 * 1000;
        startDate = now - points * interval;
        break;
      case 'ALL':
        const oldestTransactionTimestamp = transactions.reduce((oldest, t) => {
          const tDate = typeof t.date === 'string' ? new Date(t.date).getTime() : t.date;
          return tDate < oldest ? tDate : oldest;
        }, now);
        startDate = oldestTransactionTimestamp;
        const totalDays = Math.ceil((now - startDate) / (24 * 60 * 60 * 1000));
        points = Math.min(Math.max(totalDays, 7), 30);
        interval = totalDays > 0 ? (now - startDate) / points : 24 * 60 * 60 * 1000;
        break;
      default:
        points = 7;
        interval = 24 * 60 * 60 * 1000;
        startDate = now - points * interval;
    }

    // Сортируем транзакции по дате (преобразуем строки в timestamp)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date;
      return dateA - dateB;
    });

    // Создаем набор точек: базовые точки периода + точки транзакций
    const timePoints = new Set<number>();

    // Добавляем базовые точки периода
    for (let i = 0; i <= points; i++) {
      const pointDate = i === points ? now : startDate + i * interval;
      timePoints.add(pointDate);
    }

    // Добавляем точки для каждой транзакции
    for (const transaction of sortedTransactions) {
      const transactionTimestamp = typeof transaction.date === 'string'
        ? new Date(transaction.date).getTime()
        : transaction.date;

      // Добавляем точку транзакции только если она в диапазоне
      if (transactionTimestamp >= startDate && transactionTimestamp <= now) {
        timePoints.add(transactionTimestamp);
      }
    }

    // Сортируем все точки времени
    const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);

    // Вычисляем баланс для каждой точки времени
    const balanceData: DataPoint[] = [];

    for (const pointDate of sortedTimePoints) {
      // Накопительный баланс: считаем все транзакции до этой точки
      let balanceAtPoint = 0;

      for (const transaction of sortedTransactions) {
        const transactionTimestamp = typeof transaction.date === 'string'
          ? new Date(transaction.date).getTime()
          : transaction.date;

        if (transactionTimestamp <= pointDate) {
          if (transaction.type === 'income') {
            balanceAtPoint += transaction.amount;
          } else if (transaction.type === 'expense') {
            balanceAtPoint -= transaction.amount;
          }
        }
      }

      balanceData.push({
        date: pointDate,
        value: Math.max(0, balanceAtPoint),
      });
    }

    // Логирование для отладки
    console.log('📊 [BalanceChart] Данные графика:', {
      период: selectedPeriod,
      точек: balanceData.length,
      транзакций: transactions.length,
      счетов: accounts?.length || 0,
      первоеЗначение: balanceData[0]?.value,
      последнееЗначение: balanceData[balanceData.length - 1]?.value,
      всеЗначения: balanceData.map(d => d.value),
    });

    return balanceData.length > 0 ? balanceData : null;
  }, [transactions, accounts, selectedPeriod, defaultCurrency]);

  // Используем реальные данные или внешние данные
  const rawData = useMemo(() => {
    if (externalData) return externalData;
    // Всегда используем realBalanceData (включая нулевой график)
    return realBalanceData || [];
  }, [externalData, realBalanceData]);

  // Анимированные значения
  const chartOpacity = useSharedValue(1);

  // Вычисляем масштабы для отображения данных
  const { chartData, pathString, zeroLineY } = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return { chartData: [], pathString: '', zeroLineY: null };
    }

    const values = rawData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    let minVal: number;
    let maxVal: number;

    // Если все значения равны нулю
    if (max === 0 && min === 0) {
      minVal = -100;
      maxVal = 500;
    }
    // Если есть разброс значений
    else {
      const padding = (max - min) > 0 ? (max - min) * 0.15 : 100;
      minVal = min - padding;
      maxVal = max + padding;

      // Если минимум близок к нулю, начинаем чуть ниже нуля для видимости
      if (min >= 0 && min < 100) {
        minVal = -50;
      }
    }

    const scaleX = (index: number) => {
      return CHART_MARGIN + (index / (rawData.length - 1)) * (CHART_WIDTH - 2 * CHART_MARGIN);
    };

    const scaleY = (value: number) => {
      return CHART_HEIGHT - CHART_MARGIN -
        ((value - minVal) / (maxVal - minVal)) * (CHART_HEIGHT - 2 * CHART_MARGIN);
    };

    const chartDataPoints = rawData.map((d, i) => ({
      x: scaleX(i),
      y: scaleY(d.value),
      originalData: d,
    }));

    // Создаем SVG path для кривой используя d3-shape
    const lineGenerator = line<typeof chartDataPoints[0]>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(curveBasis);

    const path = lineGenerator(chartDataPoints) || '';

    // Вычисляем Y координату для линии нуля
    const zeroY = scaleY(0);

    return {
      chartData: chartDataPoints,
      pathString: path,
      zeroLineY: zeroY,
    };
  }, [rawData]);

  // Pan Responder для обработки касаний
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          handleTouch(x);
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          handleTouch(x);
        },
        onPanResponderRelease: () => {
          setTouchPosition(null);
          setSelectedPoint(null);
        },
      }),
    [chartData]
  );

  const handleTouch = useCallback((x: number) => {
    if (chartData.length === 0) return;

    // Ограничиваем X координату границами графика
    const minX = chartData[0].x;
    const maxX = chartData[chartData.length - 1].x;
    const clampedX = Math.max(minX, Math.min(maxX, x));

    // Находим два ближайших соседних точки
    let leftPoint = chartData[0];
    let rightPoint = chartData[chartData.length - 1];

    for (let i = 0; i < chartData.length - 1; i++) {
      if (chartData[i].x <= clampedX && chartData[i + 1].x >= clampedX) {
        leftPoint = chartData[i];
        rightPoint = chartData[i + 1];
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
  }, [chartData]);

  // Обработчик смены периода с анимацией
  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setSelectedPoint(null);
    setTouchPosition(null);

    // Анимация при смене периода
    chartOpacity.value = 0;
    chartOpacity.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
  };

  const periods: Period[] = ['24h', '1W', '1M', '3M', '1Y', 'ALL'];

  // Отображаемое значение и дата
  const displayValue = selectedPoint !== null ? selectedPoint.value : (rawData[rawData.length - 1]?.value ?? 0);
  const displayDate = selectedPoint !== null ? selectedPoint.date : (rawData[rawData.length - 1]?.date ?? Date.now());

  // Стиль для анимации контейнера
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Заголовок с текущим значением */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('accounts.balanceDynamics') || 'Динамика баланса'}
        </Text>
        <Text style={[styles.value, { color: colors.primary }]}>
          {formatAmount(displayValue)}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(displayDate, selectedPeriod)}
        </Text>
      </View>

      {/* График */}
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View {...panResponder.panHandlers} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Defs>
              <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors.accent || colors.primary} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>

            {/* Линия нуля (пунктирная) */}
            {zeroLineY !== null && zeroLineY >= CHART_MARGIN && zeroLineY <= CHART_HEIGHT - CHART_MARGIN && (
              <Line
                x1={CHART_MARGIN}
                y1={zeroLineY}
                x2={CHART_WIDTH - CHART_MARGIN}
                y2={zeroLineY}
                stroke={colors.border}
                strokeWidth="1"
                strokeDasharray="5,5"
                opacity="0.5"
              />
            )}

            {/* Линия графика */}
            <Path
              d={pathString}
              stroke="url(#lineGradient)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Курсор */}
            {touchPosition && (
              <>
                <Circle
                  cx={touchPosition.x}
                  cy={touchPosition.y}
                  r="8"
                  fill={colors.primary}
                  opacity="0.8"
                />
                <Circle
                  cx={touchPosition.x}
                  cy={touchPosition.y}
                  r="4"
                  fill={colors.card}
                />
              </>
            )}
          </Svg>
        </View>
      </Animated.View>

      {/* Кнопки выбора периода */}
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              {
                backgroundColor: selectedPeriod === period
                  ? colors.primary
                  : isDark ? colors.border : colors.background,
              },
            ]}
            onPress={() => handlePeriodChange(period)}
          >
            <Text
              style={[
                styles.periodText,
                {
                  color: selectedPeriod === period
                    ? '#FFFFFF'
                    : colors.text,
                  fontWeight: selectedPeriod === period ? '600' : '400',
                },
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  date: {
    fontSize: 11,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 11,
  },
});
