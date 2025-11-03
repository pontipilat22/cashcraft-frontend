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
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

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
  const chartHeight = 240;

  // Размеры графика
  const padding = { top: 60, right: 20, bottom: 30, left: 0 };
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

  // Создание пути для линии - МЕМОИЗИРОВАНО
  const linePath = useMemo(() => {
    return data
      .map((point, index) => {
        const x = xScale(index);
        const y = yScale(point.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [data, xScale, yScale]);

  // Создание области под графиком - МЕМОИЗИРОВАНО
  const areaPath = useMemo(() => {
    return data.length > 0
      ? `${linePath} L ${xScale(data.length - 1)} ${chartHeight - padding.bottom} L ${xScale(0)} ${chartHeight - padding.bottom} Z`
      : '';
  }, [data.length, linePath, xScale, chartHeight, padding.bottom]);

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
  const gradientStart = colors.primary;
  const gradientEnd = colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* График */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.chartWrapper}>
          <Svg width={cardWidth} height={chartHeight}>
            {/* Градиент для области */}
            <Defs>
              <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={gradientStart} stopOpacity={isDark ? 0.2 : 0.3} />
                <Stop offset="100%" stopColor={gradientEnd} stopOpacity="0.02" />
              </SvgLinearGradient>
            </Defs>

            {/* Область под графиком */}
            {areaPath && (
              <Path
                d={areaPath}
                fill="url(#areaGradient)"
              />
            )}

            {/* Линия графика */}
            {linePath && (
              <Path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Индикатор при наведении */}
            {hoveredIndex !== null && data[hoveredIndex] && (
              <>
                {/* Вертикальная линия */}
                <Line
                  x1={xScale(hoveredIndex)}
                  y1={padding.top}
                  x2={xScale(hoveredIndex)}
                  y2={chartHeight - padding.bottom}
                  stroke={lineColor}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                {/* Точка на линии */}
                <Circle
                  cx={xScale(hoveredIndex)}
                  cy={yScale(data[hoveredIndex].value)}
                  r="7"
                  fill={lineColor}
                  stroke={colors.card}
                  strokeWidth="3"
                />
              </>
            )}

            {/* Точка на последнем значении (когда не наведено) */}
            {hoveredIndex === null && data.length > 0 && (
              <Circle
                cx={xScale(data.length - 1)}
                cy={yScale(data[data.length - 1].value)}
                r="7"
                fill={lineColor}
                stroke={colors.card}
                strokeWidth="3"
              />
            )}
          </Svg>

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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 90,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
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
