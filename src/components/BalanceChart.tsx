// src/components/BalanceChart.tsx
import { K2D_400Regular, K2D_600SemiBold, useFonts } from '@expo-google-fonts/k2d';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Canvas, Path as SkiaPath, LinearGradient, vec, Circle as SkiaCircle, Line as SkiaLine, Shadow, BlurMask, Group } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import * as d3 from 'd3-shape';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PeriodType = '24h' | '1W' | '1M' | '3M' | '1Y';

interface DataPoint {
  date: Date;
  value: number;
  transactionAmount?: number; // Сумма транзакции для этой точки
  transactionType?: 'income' | 'expense' | 'transfer'; // Тип транзакции
}

const BalanceChart: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1M');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { accounts, transactions } = useData();
  const { formatAmount } = useCurrency();
  const { colors, isDark } = useTheme();

  const [fontsLoaded] = useFonts({
    K2D_400Regular,
    K2D_600SemiBold,
  });

  const cardWidth = SCREEN_WIDTH;
  const chartHeight = 280;

  // Размеры графика - линия на всю ширину
  const padding = { top: 70, right: 0, bottom: 40, left: 0 };
  const graphWidth = cardWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Вычисляем текущий общий баланс
  const currentBalance = useMemo(() => {
    return accounts
      .filter(acc => acc.isIncludedInTotal !== false)
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Генерация данных для графика
  const generateData = (period: PeriodType): DataPoint[] => {
    const now = new Date();
    let daysBack = 30;

    switch (period) {
      case '24h':
        daysBack = 1;
        break;
      case '1W':
        daysBack = 7;
        break;
      case '1M':
        daysBack = 30;
        break;
      case '3M':
        daysBack = 90;
        break;
      case '1Y':
        daysBack = 365;
        break;
    }

    const startDate = new Date(now);
    startDate.setTime(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Для периода 24h показываем каждую транзакцию как точку
    if (period === '24h') {
      // Фильтруем транзакции за последние 24 часа
      const recentTransactions = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate >= startDate && tDate <= now;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const data: DataPoint[] = [];

      // Начальный баланс (24 часа назад)
      let balance = currentBalance;
      recentTransactions.forEach(t => {
        if (t.type === 'income') {
          balance -= t.amount;
        } else if (t.type === 'expense') {
          balance += t.amount;
        }
      });

      // Добавляем точку начала периода
      data.push({
        date: new Date(startDate),
        value: Math.max(0, balance),
      });

      // Добавляем точку для каждой транзакции
      recentTransactions.forEach(t => {
        if (t.type === 'income') {
          balance += t.amount;
        } else if (t.type === 'expense') {
          balance -= t.amount;
        }

        data.push({
          date: new Date(t.date),
          value: Math.max(0, balance),
          transactionAmount: t.amount,
          transactionType: t.type,
        });
      });

      // Если нет транзакций, показываем текущий баланс
      if (data.length === 0) {
        data.push({
          date: startDate,
          value: currentBalance,
        });
        data.push({
          date: now,
          value: currentBalance,
        });
      }

      return data;
    }

    // Для остальных периодов - группируем по времени
    let points = 30;
    switch (period) {
      case '1W':
        points = 7;
        break;
      case '1M':
        points = 30;
        break;
      case '3M':
        points = 90;
        break;
      case '1Y':
        points = 52;
        break;
    }

    const data: DataPoint[] = [];

    // Генерируем точки данных
    for (let i = 0; i < points; i++) {
      let date: Date;

      if (period === '1Y') {
        // Для года - по неделям (52 недели)
        const weeksAgo = points - i - 1;
        date = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
      } else {
        // Для остальных периодов - равномерно распределяем точки
        const timeStep = (daysBack / (points - 1)) * 24 * 60 * 60 * 1000;
        date = new Date(startDate.getTime() + i * timeStep);
      }

      // Вычисляем баланс на эту дату (идем от текущего баланса назад)
      let balanceAtDate = currentBalance;

      // Вычитаем все транзакции после этой даты
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate > date && tDate <= now) {
          if (t.type === 'income') {
            balanceAtDate -= t.amount;
          } else if (t.type === 'expense') {
            balanceAtDate += t.amount;
          }
        }
      });

      data.push({
        date,
        value: Math.max(0, balanceAtDate),
      });
    }

    // Последняя точка всегда текущий баланс
    if (data.length > 0) {
      data[data.length - 1].value = currentBalance;
    }

    return data;
  };

  const data = useMemo(() => generateData(selectedPeriod), [selectedPeriod, accounts, transactions, currentBalance]);

  // Мемоизированные вычисления минимума и максимума - ОПТИМИЗИРОВАНО
  const { yMin, yMax } = useMemo(() => {
    if (data.length === 0) return { yMin: 0, yMax: 1 };

    const values = data.map(d => d.value);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;

    return { yMin: min, yMax: max };
  }, [data]);

  // Функции масштабирования - мемоизированы
  const xScale = useCallback((index: number) => {
    return padding.left + (index / Math.max(1, data.length - 1)) * graphWidth;
  }, [data.length, graphWidth, padding.left]);

  const yScale = useCallback((value: number) => {
    const range = yMax - yMin;
    if (range === 0) return padding.top + graphHeight / 2;
    return padding.top + graphHeight - ((value - yMin) / range) * graphHeight;
  }, [yMin, yMax, padding.top, graphHeight]);

  // Создание пути для линии с использованием d3 для плавных кривых
  const linePath = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((point, index) => ({
      x: xScale(index),
      y: yScale(point.value),
    }));

    // Используем d3 для создания плавной кривой
    const lineGenerator = d3.line<{x: number, y: number}>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5));

    return lineGenerator(points) || '';
  }, [data, xScale, yScale]);

  // Создание области под графиком с градиентом
  const areaPath = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((point, index) => ({
      x: xScale(index),
      y: yScale(point.value),
    }));

    const areaGenerator = d3.area<{x: number, y: number}>()
      .x(d => d.x)
      .y0(chartHeight - padding.bottom)
      .y1(d => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5));

    return areaGenerator(points) || '';
  }, [data, xScale, yScale, chartHeight, padding.bottom]);

  // Создание пути для сетки
  const gridLines = useMemo(() => {
    const lines = [];
    const gridCount = 4;

    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (graphHeight / gridCount) * i;
      lines.push({
        x1: 0,
        y1: y,
        x2: cardWidth,
        y2: y,
      });
    }

    return lines;
  }, [graphHeight, padding, cardWidth]);

  // Обработка жестов
  const updateHoveredIndex = (index: number | null) => {
    setHoveredIndex(index);
  };

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      const x = e.x;
      const index = Math.round(((x - padding.left) / graphWidth) * (data.length - 1));
      if (index >= 0 && index < data.length) {
        runOnJS(updateHoveredIndex)(index);
      }
    })
    .onUpdate((e) => {
      'worklet';
      const x = e.x;
      const index = Math.round(((x - padding.left) / graphWidth) * (data.length - 1));
      if (index >= 0 && index < data.length) {
        runOnJS(updateHoveredIndex)(index);
      }
    })
    .onEnd(() => {
      'worklet';
      runOnJS(updateHoveredIndex)(null);
    });

  // Получаем данные для отображения подсказки
  const tooltipData = hoveredIndex !== null && data[hoveredIndex] ? (() => {
    const point = data[hoveredIndex];

    return {
      balance: formatAmount(point.value),
      transactionAmount: point.transactionAmount,
      transactionType: point.transactionType,
      date: point.date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: selectedPeriod === '1Y' ? 'numeric' : undefined,
        hour: selectedPeriod === '24h' ? 'numeric' : undefined,
        minute: selectedPeriod === '24h' ? 'numeric' : undefined,
      }),
      x: xScale(hoveredIndex),
      y: yScale(point.value),
    };
  })() : null;

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { height: chartHeight, backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Цвета для темной и светлой темы
  const lineColor = colors.primary;
  const lineColorRgb = hexToRgb(lineColor);
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* График */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.chartWrapper}>
          <Canvas style={{ width: cardWidth, height: chartHeight }}>
            {/* Сетка на фоне */}
            {gridLines.map((line, index) => (
              <SkiaLine
                key={`grid-${index}`}
                p1={vec(line.x1, line.y1)}
                p2={vec(line.x2, line.y2)}
                color={gridColor}
                style="stroke"
                strokeWidth={1}
              />
            ))}

            {/* Область под графиком с градиентом */}
            {areaPath && (
              <Group>
                <SkiaPath path={areaPath} style="fill">
                  <LinearGradient
                    start={vec(0, padding.top)}
                    end={vec(0, chartHeight - padding.bottom)}
                    colors={[
                      `${lineColor}${isDark ? '40' : '50'}`,
                      `${lineColor}05`,
                    ]}
                  />
                </SkiaPath>
              </Group>
            )}

            {/* Свечение под линией графика */}
            {linePath && (
              <Group>
                <SkiaPath
                  path={linePath}
                  style="stroke"
                  strokeWidth={8}
                  color={`${lineColor}30`}
                >
                  <BlurMask blur={12} style="solid" />
                </SkiaPath>
              </Group>
            )}

            {/* Основная линия графика */}
            {linePath && (
              <Group>
                <SkiaPath
                  path={linePath}
                  style="stroke"
                  strokeWidth={3.5}
                  strokeCap="round"
                  strokeJoin="round"
                  color={lineColor}
                />
              </Group>
            )}

            {/* Индикатор при наведении */}
            {hoveredIndex !== null && data[hoveredIndex] && (
              <Group>
                {/* Вертикальная линия с градиентом */}
                <SkiaLine
                  p1={vec(xScale(hoveredIndex), padding.top)}
                  p2={vec(xScale(hoveredIndex), chartHeight - padding.bottom)}
                  color={`${lineColor}40`}
                  style="stroke"
                  strokeWidth={2}
                />

                {/* Свечение точки */}
                <SkiaCircle
                  cx={xScale(hoveredIndex)}
                  cy={yScale(data[hoveredIndex].value)}
                  r={14}
                  color={`${lineColor}30`}
                >
                  <BlurMask blur={8} style="solid" />
                </SkiaCircle>

                {/* Внешнее кольцо */}
                <SkiaCircle
                  cx={xScale(hoveredIndex)}
                  cy={yScale(data[hoveredIndex].value)}
                  r={10}
                  style="stroke"
                  strokeWidth={2.5}
                  color={lineColor}
                  opacity={0.4}
                />

                {/* Основная точка */}
                <SkiaCircle
                  cx={xScale(hoveredIndex)}
                  cy={yScale(data[hoveredIndex].value)}
                  r={7}
                  color={lineColor}
                >
                  <Shadow dx={0} dy={2} blur={6} color="rgba(0,0,0,0.25)" />
                </SkiaCircle>

                {/* Центральная точка */}
                <SkiaCircle
                  cx={xScale(hoveredIndex)}
                  cy={yScale(data[hoveredIndex].value)}
                  r={3}
                  color={colors.card}
                />
              </Group>
            )}

            {/* Точка на последнем значении (когда не наведено) */}
            {hoveredIndex === null && data.length > 0 && (
              <Group>
                {/* Пульсирующее свечение */}
                <SkiaCircle
                  cx={xScale(data.length - 1)}
                  cy={yScale(data[data.length - 1].value)}
                  r={16}
                  color={`${lineColor}20`}
                >
                  <BlurMask blur={10} style="solid" />
                </SkiaCircle>

                {/* Внешнее кольцо */}
                <SkiaCircle
                  cx={xScale(data.length - 1)}
                  cy={yScale(data[data.length - 1].value)}
                  r={10}
                  style="stroke"
                  strokeWidth={2}
                  color={`${lineColor}60`}
                />

                {/* Основная точка */}
                <SkiaCircle
                  cx={xScale(data.length - 1)}
                  cy={yScale(data[data.length - 1].value)}
                  r={7}
                  color={lineColor}
                >
                  <Shadow dx={0} dy={3} blur={8} color="rgba(0,0,0,0.3)" />
                </SkiaCircle>

                {/* Центральная точка */}
                <SkiaCircle
                  cx={xScale(data.length - 1)}
                  cy={yScale(data[data.length - 1].value)}
                  r={3}
                  color={colors.card}
                />
              </Group>
            )}
          </Canvas>

          {/* Всплывающая подсказка */}
          {tooltipData && (
            <View
              style={[
                styles.tooltip,
                {
                  backgroundColor: lineColor,
                  left: tooltipData.x > cardWidth / 2 ? tooltipData.x - 110 : tooltipData.x + 20,
                  top: Math.max(10, Math.min(tooltipData.y - 35, chartHeight - 70)),
                },
              ]}
            >
              <Text style={styles.tooltipAmount}>{tooltipData.balance}</Text>
              {tooltipData.transactionAmount !== undefined && tooltipData.transactionType && (
                <Text style={[
                  styles.tooltipTransaction,
                  { color: tooltipData.transactionType === 'income' ? '#81C784' : '#F44336' }
                ]}>
                  {tooltipData.transactionType === 'income' ? '+' : '-'}{formatAmount(tooltipData.transactionAmount)}
                </Text>
              )}
              <Text style={styles.tooltipDate}>{tooltipData.date}</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Периоды */}
      <View style={styles.periodsWrapper}>
        {(['24h', '1W', '1M', '3M', '1Y'] as PeriodType[]).map((period) => {
          const active = period === selectedPeriod;
          return (
            <Pressable
              key={period}
              style={[
                styles.periodButton,
                active && [styles.periodButtonActive, { backgroundColor: lineColor }],
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                active && styles.periodTextActive,
              ]}>
                {period}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Вспомогательная функция для конвертации hex в rgb
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export default BalanceChart;

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  chartWrapper: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 100,
  },
  tooltipAmount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'K2D_600SemiBold',
  },
  tooltipTransaction: {
    fontSize: 13,
    fontFamily: 'K2D_600SemiBold',
    marginTop: 2,
  },
  tooltipDate: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'K2D_400Regular',
    marginTop: 3,
    opacity: 0.95,
  },
  periodsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 8,
  },
  periodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  periodText: {
    fontSize: 13,
    fontFamily: 'K2D_400Regular',
    color: '#C6C6C6',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontFamily: 'K2D_600SemiBold',
  },
});
