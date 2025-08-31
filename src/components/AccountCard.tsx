import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, RadialGradient, Stop, Circle, Mask } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Account } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';

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
  onAddToSavings?: () => void;
  onWithdrawFromSavings?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onLongPress,
  onAddToSavings,
  onWithdrawFromSavings,
}) => {
  const { colors, isDark } = useTheme();
  const { defaultCurrency, formatAmount, getCurrencyInfo } = useCurrency();
  const { t } = useLocalization();
  const { accounts } = useData();
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  // Логируем для отладки
  React.useEffect(() => {
    if (account.currency && account.currency !== defaultCurrency) {
      console.log(`AccountCard ${account.name}: currency=${account.currency}, exchangeRate=${(account as any).exchangeRate}`);
    }
  }, [account]);
  
  // Получаем связанный счет для накоплений
  const linkedAccount = account.linkedAccountId 
    ? accounts.find(acc => acc.id === account.linkedAccountId) 
    : null;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    if (onLongPress) {
      onLongPress();
    }
  };

  const getIcon = () => {
    // Если есть кастомная иконка, используем её
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

  const getBalanceDisplay = (amount: number, showConverted: boolean = false) => {
    const accountCurrency = account.currency || defaultCurrency;
    const currencyInfo = getCurrencyInfo(accountCurrency);
    
    // Форматируем сумму в валюте счета
    const formattedAmount = formatAmount(amount, accountCurrency);
    
    // Если валюта счета отличается от основной и есть курс обмена, показываем конвертированную сумму
    if (showConverted && accountCurrency !== defaultCurrency && 'exchangeRate' in account && (account as any).exchangeRate) {
      const convertedAmount = amount * ((account as any).exchangeRate || 1);
      const convertedFormatted = formatAmount(convertedAmount, defaultCurrency);
      
      return (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.balance, { color: isDark ? '#fff' : '#232323' }]}>
            {formattedAmount}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
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

  const formatBalance = (amount: number) => {
    const accountCurrency = account.currency || defaultCurrency;
    return formatAmount(amount, accountCurrency);
  };
  
  const getProgress = () => {
    if (account.type !== 'savings' || !account.targetAmount) return 0;
    // Для накоплений используем savedAmount вместо balance
    const saved = account.savedAmount || 0;
    return Math.min((saved / account.targetAmount) * 100, 100);
  };
  
  // Получаем сумму зарезервированную в накоплениях для данного счета
  const getReservedAmount = () => {
    if (account.type === 'savings') return 0;
    const linkedSavings = accounts.filter(acc => 
      acc.type === 'savings' && acc.linkedAccountId === account.id
    );
    return linkedSavings.reduce((sum, saving) => sum + (saving.savedAmount || 0), 0);
  };

  const calculateMonthlyPayment = () => {
    if (account.type !== 'credit' || !account.creditRate || !account.creditTerm || !account.creditInitialAmount) {
      return 0;
    }

    const principal = account.creditInitialAmount;
    const monthlyRate = account.creditRate / 100 / 12;
    const months = account.creditTerm;

    if (account.creditPaymentType === 'annuity') {
      // Аннуитетный платеж
      if (monthlyRate === 0) {
        return principal / months;
      }
      const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      return Math.round(payment);
    } else {
      // Дифференцированный платеж (возвращаем первый платеж)
      const principalPayment = principal / months;
      const interestPayment = principal * monthlyRate;
      return Math.round(principalPayment + interestPayment);
    }
  };

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
      // Дифференцированный платеж
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

  // Определяем цвет иконки в зависимости от типа счета и темы
  const getIconColor = () => {
    if (account.isDefault) {
      // Для счета по умолчанию - яркий цвет
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
    // Для обычных счетов - серый цвет
    return isDark ? '#9CA3AF' : '#6B7280';
  };

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
                      width: `${Math.round(getProgress())}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.content}>
                <View style={styles.row}>
                  <IconDisc 
                    icon={getIcon()} 
                    iconColor={getIconColor()}
                    isDark={isDark}
                  />
                  <View style={styles.textBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.title,
                          {
                            color: isDark ? '#fff' : '#232323',
                            fontWeight: '700',
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
                        fontWeight: '500',
                        marginTop: 2,
                        fontSize: 14,
                      }}
                    >
                      {formatBalance(account.savedAmount || 0)} / {formatBalance(account.targetAmount || 0)}
                    </Text>
                    {linkedAccount && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons 
                          name={linkedAccount.type === 'cash' ? 'cash-outline' : 'card-outline'} 
                          size={10} 
                          color={colors.textSecondary} 
                        />
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 3 }}>
                          {linkedAccount.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: isDark ? '#fff' : '#232323',
                        fontWeight: '700',
                        fontSize: 20,
                        textShadowColor: isDark ? 'rgba(0,0,0,0.15)' : 'transparent',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {Math.floor(getProgress())}%
                    </Text>
                    {/* Компактные кнопки */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity 
                        style={[styles.compactButton, { 
                          backgroundColor: isDark ? colors.card : '#f0f0f0',
                          borderWidth: 1,
                          borderColor: colors.border,
                        }]}
                        onPress={onAddToSavings}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.compactButton, { 
                          backgroundColor: isDark ? colors.card : '#f0f0f0',
                          borderWidth: 1,
                          borderColor: colors.border,
                        }]}
                        onPress={onWithdrawFromSavings}
                      >
                        <Ionicons name="remove" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.content}>
              <View style={styles.row}>
                <IconDisc 
                  icon={getIcon()} 
                  iconColor={getIconColor()}
                  isDark={isDark}
                />
                <View style={styles.textBlock}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.title, { color: isDark ? '#fff' : '#232323' }]} numberOfLines={1}>
                      {account.name}
                    </Text>
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
                        {formatBalance(calculateMonthlyPayment())}{t('accounts.perMonth')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {account.type === 'credit' ? (
                    <>
                      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 2 }]}>
                        {t('accounts.remainingPayment')}
                      </Text>
                      {getBalanceDisplay(Math.abs(account.balance), true)}
                    </>
                  ) : (
                    <>
                      {getBalanceDisplay(account.balance, true)}
                      {getReservedAmount() > 0 && (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {formatBalance(getReservedAmount())} {t('accounts.inSavings')}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
    </Animated.View>
  );
};

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
    shadowOffset: { width: 1, height: 4 },
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
    fontWeight: '600',
    marginBottom: 2,
  },
  
  subtitle: {
    fontSize: 13,
  },
  
  balance: {
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: '700',
    marginTop: 2,
  },

  compactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 