import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, RadialGradient, Stop, Circle, Mask } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Account } from '../types/index';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';
import { useBudgetContext } from '../context/BudgetContext';
import { K2D_400Regular, K2D_600SemiBold, useFonts } from '@expo-google-fonts/k2d';

// Type workaround for React 19 compatibility
const SvgComponent = Svg as any;
const DefsComponent = Defs as any;
const RadialGradientComponent = RadialGradient as any;
const StopComponent = Stop as any;
const CircleComponent = Circle as any;
const MaskComponent = Mask as any;

// Design constants
const SIZES = {
  cardRadius: 28,
  cardPad: 18,
  disc: 50,
  innerDisc: 44,
};

const INSET = {
  x: 2,
  y: 4,
  blur: 4,
  fill: '#F5F5F5',
  aSoft: 0.01,
  aMid: 0.20,
  aHard: 0.20,
};

// Embossed Icon Component - без теней
function EmbossedIcon({ name, size = 22, color = '#6B7280' }: { name: keyof typeof Ionicons.glyphMap; size?: number; color?: string }) {
  return (
    <View style={styles.iconCenter}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

// Icon Disc Component  
function IconDisc({ icon, iconColor = '#6B7280', isDark = false }: { icon: keyof typeof Ionicons.glyphMap; iconColor?: string; isDark?: boolean }) {
  const R = SIZES.innerDisc / 2;
  const cxP = ((R + INSET.x) / (2 * R)) * 100;
  const cyP = ((R + INSET.y) / (2 * R)) * 100;

  return (
    <View style={styles.discContainer}>
      <View style={[styles.disc, isDark && { backgroundColor: '#2C2C2C', shadowOpacity: 0 }]} />
      <View style={[styles.innerDisc, isDark && { backgroundColor: '#2C2C2C' }]}>
        <SvgComponent width={SIZES.innerDisc} height={SIZES.innerDisc} style={StyleSheet.absoluteFill} pointerEvents="none">
          <DefsComponent>
            <RadialGradientComponent id="innerEdgeXY" cx={`${cxP}%`} cy={`${cyP}%`} r="66%">
              <StopComponent offset="0%" stopColor="#000" stopOpacity={0} />
              <StopComponent offset="78%" stopColor="#000" stopOpacity={INSET.aSoft} />
              <StopComponent offset="90%" stopColor="#000" stopOpacity={INSET.aMid} />
              <StopComponent offset="100%" stopColor="#000" stopOpacity={INSET.aHard} />
            </RadialGradientComponent>
            <MaskComponent id="innerRing" x="0" y="0" width={SIZES.innerDisc} height={SIZES.innerDisc}>
              <CircleComponent cx={R} cy={R} r={R} fill="#fff" />
              <CircleComponent cx={R} cy={R} r={R - INSET.blur} fill="#000" />
            </MaskComponent>
          </DefsComponent>
          <CircleComponent cx={R} cy={R} r={R} fill={isDark ? '#2C2C2C' : INSET.fill} />
          <CircleComponent cx={R} cy={R} r={R} fill="url(#innerEdgeXY)" mask="url(#innerRing)" />
        </SvgComponent>
        <EmbossedIcon name={icon} color={iconColor} />
      </View>
    </View>
  );
}

interface AccountCardProps {
  account: Account;
  onPress: () => void;
  onLongPress?: () => void;
}

const AccountCardComponent: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onLongPress,
}) => {
  // ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ ДО УСЛОВНОГО ВОЗВРАТА
  const [fontsLoaded] = useFonts({
    K2D_400Regular,
    K2D_600SemiBold,
  });

  const { colors, isDark } = useTheme();
  const { defaultCurrency, formatAmount, getCurrencyInfo } = useCurrency();
  const { t } = useLocalization();
  const { accounts, getAccountReservedAmount } = useData();
  const { trackingData, isEnabled: isBudgetEnabled } = useBudgetContext();
  const [isPressed, setIsPressed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  // Логируем для отладки
  React.useEffect(() => {
    if (account.currency && account.currency !== defaultCurrency) {
      console.log(`AccountCard ${account.name}: currency=${account.currency}, exchangeRate=${(account as any).exchangeRate}`);
    }
  }, [account]);

  // Мемоизация всех обработчиков
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    if (onLongPress) {
      onLongPress();
    }
  }, [onLongPress]);

  const toggleExpand = useCallback((e: any) => {
    e.stopPropagation();
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [isExpanded, expandAnim]);

  // Объединенная мемоизация всех вычислений
  const computed = useMemo(() => {
    // getIcon
    const getIcon = () => {
      if (account.icon) {
        return account.icon as keyof typeof Ionicons.glyphMap;
      }

      if (account.type === 'savings' && account.icon) {
        return account.icon as keyof typeof Ionicons.glyphMap;
      }

      switch (account.type) {
        case 'cash':
          return 'cash-outline';
        case 'card':
          return 'card-outline';
        case 'savings':
          return 'trending-up-outline';
        case 'debt':
          return 'arrow-down-circle-outline';
        case 'credit':
          return 'card-outline';
        default:
          return 'wallet-outline';
      }
    };

    // formatBalance
    const formatBalance = (amount: number) => {
      const accountCurrency = account.currency || defaultCurrency;
      return formatAmount(amount, accountCurrency);
    };

    // getProgress
    const getProgress = () => {
      if (account.type !== 'savings' || !account.targetAmount) return 0;
      const saved = account.savedAmount || 0;
      return Math.min((saved / account.targetAmount) * 100, 100);
    };

    // getReservedAmount (в целях)
    const getReservedAmount = () => {
      if (account.type === 'savings') return 0;
      return getAccountReservedAmount(account.id);
    };

    // getBudgetReservedAmount (зарезервировано бюджетом как сбережения)
    const getBudgetReservedAmount = () => {
      if (!isBudgetEnabled || account.type === 'savings') return 0;
      // Возвращаем сумму сбережений из бюджетной системы
      return trackingData?.savingsAmount || 0;
    };

    // calculateMonthlyPayment
    const calculateMonthlyPayment = () => {
      if (account.type !== 'credit' || !account.creditRate || !account.creditTerm || !account.creditInitialAmount) {
        return 0;
      }

      const principal = account.creditInitialAmount;
      const monthlyRate = account.creditRate / 100 / 12;
      const months = account.creditTerm;

      if (account.creditPaymentType === 'annuity') {
        if (monthlyRate === 0) {
          return principal / months;
        }
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        return Math.round(payment);
      } else {
        const principalPayment = principal / months;
        const interestPayment = principal * monthlyRate;
        return Math.round(principalPayment + interestPayment);
      }
    };

    // calculateTotalPayment
    const calculateTotalPayment = () => {
      if (account.type !== 'credit' || !account.creditRate || !account.creditTerm || !account.creditInitialAmount) {
        return 0;
      }

      const principal = account.creditInitialAmount;
      const monthlyRate = account.creditRate / 100 / 12;
      const months = account.creditTerm;

      if (account.creditPaymentType === 'annuity') {
        if (monthlyRate === 0) {
          return principal;
        }
        const monthlyPayment = calculateMonthlyPayment();
        return monthlyPayment * months;
      } else {
        let totalPayment = 0;
        for (let i = 0; i < months; i++) {
          const remainingPrincipal = principal - (principal / months) * i;
          const interestPayment = remainingPrincipal * monthlyRate;
          const principalPayment = principal / months;
          totalPayment += principalPayment + interestPayment;
        }
        return Math.round(totalPayment);
      }
    };

    // getIconColor
    const getIconColor = () => {
      if (account.isDefault) {
        return isDark ? '#FFA726' : '#2196F3';
      }
      if (account.type === 'savings') {
        return isDark ? '#FF9800' : '#3B82F6';
      }
      if (account.type === 'credit') {
        return isDark ? '#FF6B6B' : '#EF4444';
      }
      if (account.type === 'debt' as any) {
        return isDark ? '#4CAF50' : '#10B981';
      }
      return isDark ? '#9CA3AF' : '#6B7280';
    };

    // getBalanceDisplay
    const getBalanceDisplay = (amount: number, showConverted: boolean = false) => {
      const accountCurrency = account.currency || defaultCurrency;
      const currencyInfo = getCurrencyInfo(accountCurrency);

      const formattedAmount = formatAmount(amount, accountCurrency);

      if (showConverted && accountCurrency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
        const convertedAmount = amount * ((account as any).exchangeRate || 1);
        const convertedFormatted = formatAmount(convertedAmount, defaultCurrency);

        return (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.balance, { color: isDark ? '#fff' : '#232323' }]}>
              {formattedAmount}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2, fontFamily: 'K2D_400Regular' }}>
              ≈ {convertedFormatted}
            </Text>
          </View>
        );
      }

      return (
        <Text style={[styles.balance, { color: isDark ? '#fff' : '#232323' }]}>
          {formattedAmount}
        </Text>
      );
    };

    // linkedAccount
    const linkedAccount = account.linkedAccountId
      ? accounts.find(acc => acc.id === account.linkedAccountId)
      : null;

    return {
      icon: getIcon(),
      formatBalance,
      progress: getProgress(),
      reservedAmount: getReservedAmount(),
      budgetReservedAmount: getBudgetReservedAmount(),
      monthlyPayment: calculateMonthlyPayment(),
      totalPayment: calculateTotalPayment(),
      iconColor: getIconColor(),
      getBalanceDisplay,
      linkedAccount,
    };
  }, [
    account,
    defaultCurrency,
    formatAmount,
    getCurrencyInfo,
    isDark,
    colors.textSecondary,
    accounts,
    getAccountReservedAmount,
    isBudgetEnabled,
    trackingData,
  ]);

  // Условный возврат ПОСЛЕ всех хуков
  if (!fontsLoaded) {
    return null;
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
          styles.card,
          {
            backgroundColor: isDark ? '#232323' : '#FFFFFF',
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.10,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }
        ]}
        activeOpacity={0.95}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          delayLongPress={500}
        >

          {account.type === 'savings' && ((account as any).isTargetedSavings !== false) && account.targetAmount ? (
            <>
              <View style={styles.progressContainer}>
                <LinearGradient
                  colors={isDark ? ['#FF9800', '#FFD600'] : ['#3B82F6', '#00E0FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(computed.progress)}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.content}>
                <View style={styles.row}>
                  <IconDisc
                    icon={computed.icon}
                    iconColor={computed.iconColor}
                    isDark={isDark}
                  />
                  <View style={styles.textBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.title,
                          {
                            color: isDark ? '#fff' : '#232323',
                            fontFamily: 'K2D_600SemiBold',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {account.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: isDark ? '#fff' : '#232323',
                        fontFamily: 'K2D_400Regular',
                        marginTop: 2,
                        fontSize: 14,
                      }}
                    >
                      {computed.formatBalance(account.savedAmount || 0)} / {computed.formatBalance(account.targetAmount || 0)}
                    </Text>
                    {computed.linkedAccount && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons
                          name={computed.linkedAccount.type === 'cash' ? 'cash-outline' : 'card-outline'}
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 3, fontFamily: 'K2D_400Regular' }}>
                          {computed.linkedAccount.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: isDark ? '#fff' : '#232323',
                        fontFamily: 'K2D_600SemiBold',
                        fontSize: 20,
                        textShadowColor: isDark ? 'rgba(0,0,0,0.15)' : 'transparent',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {Math.floor(computed.progress)}%
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.content}>
              <View style={styles.row}>
                <IconDisc
                  icon={computed.icon}
                  iconColor={computed.iconColor}
                  isDark={isDark}
                />
                <View style={styles.textBlock}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.title, { color: isDark ? '#fff' : '#232323' }]} numberOfLines={1}>
                      {account.name}
                    </Text>
                    {/* Стрелка для раскрытия, показываем только если есть что показывать */}
                    {(computed.reservedAmount > 0 || computed.budgetReservedAmount > 0) && account.type !== 'credit' && (
                      <TouchableOpacity onPress={toggleExpand} style={{ padding: 4, marginLeft: 8 }}>
                        <Animated.View style={{
                          transform: [{
                            rotate: expandAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '180deg']
                            })
                          }]
                        }}>
                          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                        </Animated.View>
                      </TouchableOpacity>
                    )}
                  </View>
                  {account.type === 'card' && account.cardNumber && (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      •••• {account.cardNumber}
                    </Text>
                  )}
                  {account.type === 'credit' && account.creditTerm && account.creditRate !== undefined && account.creditPaymentType && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12 }]}>
                        {account.creditTerm} {t('accounts.monthsShort')} • {account.creditRate}% • {account.creditPaymentType === 'annuity' ? t('accounts.annuity') : t('accounts.differentiated')}
                      </Text>
                      <Text style={[styles.creditPayment, { color: colors.primary }]}>
                        {computed.formatBalance(computed.monthlyPayment)}{t('accounts.perMonth')}
                      </Text>
                      {/* Прогресс выплаты кредита */}
                      {account.creditInitialAmount && account.creditInitialAmount > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'K2D_400Regular' }}>
                              {t('accounts.paidOff')}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'K2D_600SemiBold' }}>
                              {Math.round(((account.creditInitialAmount - Math.abs(account.balance)) / account.creditInitialAmount) * 100)}%
                            </Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: isDark ? '#2C2C2C' : '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{
                              height: '100%',
                              width: `${Math.min(100, ((account.creditInitialAmount - Math.abs(account.balance)) / account.creditInitialAmount) * 100)}%`,
                              backgroundColor: isDark ? '#FF6B6B' : '#EF4444',
                            }} />
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {account.type === 'credit' ? (
                    <>
                      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 2 }]}>
                        {t('accounts.remainingPayment')}
                      </Text>
                      {computed.getBalanceDisplay(Math.abs(account.balance), true)}
                    </>
                  ) : (
                    <>
                      {computed.getBalanceDisplay(account.balance, true)}
                    </>
                  )}
                </View>
              </View>

              {/* Раскрывающийся блок с детальной информацией о средствах */}
              {(computed.reservedAmount > 0 || computed.budgetReservedAmount > 0) && account.type !== 'credit' && (
                <Animated.View style={{
                  maxHeight: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200]
                  }),
                  opacity: expandAnim,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#2C2C2C' : '#E5E7EB',
                  }}>
                    {/* Свободные средства */}
                    <View style={styles.detailRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('accounts.available')}
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#232323' }]}>
                        {computed.formatBalance(account.balance - computed.reservedAmount - computed.budgetReservedAmount)}
                      </Text>
                    </View>

                    {/* В целях (накоплениях) */}
                    {computed.reservedAmount > 0 && (
                      <View style={styles.detailRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                            {t('accounts.inGoals')}
                          </Text>
                        </View>
                        <Text style={[styles.detailValue, { color: isDark ? '#FF9800' : '#3B82F6' }]}>
                          {computed.formatBalance(computed.reservedAmount)}
                        </Text>
                      </View>
                    )}

                    {/* Зарезервировано бюджетом */}
                    {computed.budgetReservedAmount > 0 && (
                      <View style={styles.detailRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                            Зарезервировано бюджетом
                          </Text>
                        </View>
                        <Text style={[styles.detailValue, { color: isDark ? '#4CAF50' : '#10B981' }]}>
                          {computed.formatBalance(computed.budgetReservedAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </TouchableOpacity>
    </Animated.View>
  );
};

// Экспорт мемоизированного компонента
export const AccountCard = React.memo(AccountCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.cardRadius,
    padding: SIZES.cardPad,
    marginBottom: 16,
  },
  
  discContainer: {
    width: SIZES.disc,
    height: SIZES.disc,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disc: {
    width: SIZES.disc,
    height: SIZES.disc,
    borderRadius: SIZES.disc / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6.5,
    shadowOffset: { width: 4, height: 8},
    elevation: 4,
  },

  innerDisc: {
    position: 'absolute',
    width: SIZES.innerDisc,
    height: SIZES.innerDisc,
    borderRadius: SIZES.innerDisc / 2,
    backgroundColor: INSET.fill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCenter: {
    position: 'absolute',
    width: SIZES.innerDisc,
    height: SIZES.innerDisc,
    borderRadius: SIZES.innerDisc / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconOverlay: {
    position: 'absolute',
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    zIndex: 1,
    flex: 1,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  textBlock: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  
  title: {
    fontSize: 16,
    fontFamily: 'K2D_600SemiBold',
    marginBottom: 2,
  },
  
  subtitle: {
    fontSize: 13,
    fontFamily: 'K2D_400Regular',
  },
  
  balance: {
    fontSize: 20,
    fontFamily: 'K2D_600SemiBold',
    textAlign: 'right',
  },
  
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SIZES.cardRadius,
    overflow: 'hidden',
    zIndex: 0,
  },
  
  progressFill: {
    height: '100%',
    borderRadius: SIZES.cardRadius,
  },
  
  creditPayment: {
    fontSize: 14,
    fontFamily: 'K2D_600SemiBold',
    marginTop: 2,
  },

  compactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  detailLabel: {
    fontSize: 13,
    fontFamily: 'K2D_400Regular',
    marginLeft: 8,
  },

  detailValue: {
    fontSize: 15,
    fontFamily: 'K2D_600SemiBold',
  },
});