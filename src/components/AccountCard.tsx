import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { Account } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';

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
    // Добавляем вибрацию для обратной связи
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    
    // Вызываем колбэк для долгого нажатия
    if (onLongPress) {
      onLongPress();
    }
  };

  const getHighlightColor = () => {
    if (!isPressed) return colors.card;
    
    // Для светлой темы делаем карточку темнее, для темной - светлее
    if (isDark) {
      return colors.primary + '30'; // Добавляем прозрачность к основному цвету
    } else {
      return colors.primary + '20'; // Более прозрачный для светлой темы
    }
  };

  const getIcon = () => {
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#232323' : '#f5f5f5',
            borderWidth: isPressed ? 1 : 0,
            borderColor: isPressed ? colors.primary : 'transparent',
            // Неоморфные тени - усиленные
            shadowColor: isDark ? '#000' : '#c0c0c0',
            shadowOffset: { width: 8, height: 8 },
            shadowOpacity: isDark ? 0.7 : 0.4,
            shadowRadius: 15,
            elevation: isPressed ? 5 : 12,
          },
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {/* Верхняя светлая тень для неоморфизма */}
        <View style={[
          styles.neumorphicLight,
          {
            backgroundColor: isDark ? '#505050' : '#ffffff',
            opacity: isPressed ? 0 : (isDark ? 0.4 : 0.9),
            shadowColor: isDark ? '#505050' : '#ffffff',
            shadowOffset: { width: -6, height: -6 },
            shadowOpacity: isDark ? 0.4 : 0.8,
            shadowRadius: 12,
            elevation: 2,
          }
        ]} />
        
        {account.type === 'savings' && account.targetAmount ? (
          <>
            <LinearGradient
              colors={isDark ? ['#FF9800', '#FFD600'] : ['#3B82F6', '#00E0FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                {
                  width: `${getProgress()}%`,
                },
              ]}
            />
            <View style={[styles.content, { paddingBottom: 12 }]}>
              <View style={styles.row}>
                <View style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8',
                    // Неоморфные тени для иконки - усиленные
                    shadowColor: isDark ? '#000' : '#a0a0a0',
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: isDark ? 0.6 : 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  },
                ]}>
                  {/* Внутренняя светлая тень */}
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? '#404040' : '#ffffff',
                    opacity: isDark ? 0.3 : 0.6,
                  }} />
                  <Ionicons
                    name={getIcon()}
                    size={24}
                    color={isDark ? '#fff' : '#232323'}
                  />
                </View>
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
              <View style={[
                styles.iconCircle, 
                { 
                  backgroundColor: colors.primary,
                  // Неоморфные тени для иконки - усиленные
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}> 
                <Ionicons name={getIcon()} size={24} color="#fff" />
              </View>
              <View style={styles.textBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.title, { color: isDark ? '#fff' : '#232323' }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                </View>
                {account.type === 'card' && account.cardNumber && (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
                    {account.cardNumber}
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
  container: {
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: 380,
    alignSelf: 'center',
    width: '95%',
    marginHorizontal: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  defaultIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceContainer: {
    marginBottom: 8,
  },
  balance: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  targetAmount: {
    fontSize: 13,
    marginTop: 4,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 0,
  },
  content: {
    padding: 16,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  creditInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  defaultBadge: {
    padding: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditTotal: {
    fontSize: 14,
    marginTop: 2,
  },
  progressText: {
    fontSize: 12,
    marginLeft: 8,
  },
  creditPayment: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  neumorphicLight: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: 2,
    bottom: 2,
    borderRadius: 16,
    opacity: 0.5,
  },
  savingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  savingsButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  savingsDivider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: -12,
  },
  compactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 