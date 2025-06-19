import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { Transaction, Category, Account } from '../types';
import { CURRENCIES } from '../config/currencies';
import { getLocalizedCategory } from '../utils/categoryUtils';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onPress?: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({ 
  transaction, 
  category,
  account,
  onPress,
  onLongPress,
  isSelected = false,
  isSelectionMode = false,
}) => {
  const { colors } = useTheme();
  const { defaultCurrency } = useCurrency();
  const { t } = useLocalization();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [isLongPressed, setIsLongPressed] = React.useState(false);
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    setIsLongPressed(false);
  };
  
  const handleLongPress = () => {
    setIsLongPressed(true);
    Vibration.vibrate(50);
    onLongPress?.();
  };
  
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? '#4CAF50' : colors.text;
  
  // Определяем валюту счета
  const accountCurrency = account?.currency || defaultCurrency;
  const currencySymbol = CURRENCIES[accountCurrency]?.symbol || CURRENCIES[defaultCurrency]?.symbol || '$';
  
  // Проверяем, является ли транзакция переводом
  const isTransfer = transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense';
  const transferMatch = transaction.description?.match(/[→←]/);
  const isTransferTransaction = isTransfer && transferMatch;
  
  // Определяем тип долговой операции
  const getDebtType = (description?: string) => {
    if (!description) return null;
    
    // Сначала проверяем новый формат с префиксом
    const match = description.match(/\[DEBT:(give|return|borrow|payback)\]/);
    if (match) return match[1];
    
    // Для старых транзакций проверяем по ключевым словам
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('дал в долг') || lowerDesc.includes('дала в долг')) return 'give';
    if (lowerDesc.includes('получил долг') || lowerDesc.includes('получила долг')) return 'return';
    if (lowerDesc.includes('взял в долг') || lowerDesc.includes('взяла в долг')) return 'borrow';
    if (lowerDesc.includes('вернул долг') || lowerDesc.includes('вернула долг')) return 'payback';
    
    return null;
  };
  
  const debtType = getDebtType(transaction.description);
  
  // Получаем иконку и цвет для долговой операции
  const getDebtIconAndColor = () => {
    switch (debtType) {
      case 'give':
        return { icon: 'arrow-up-circle', color: '#2196F3' };
      case 'return':
        return { icon: 'checkmark-circle', color: '#4CAF50' };
      case 'borrow':
        return { icon: 'arrow-down-circle', color: '#9C27B0' };
      case 'payback':
        return { icon: 'checkmark-circle', color: '#FF5252' };
      default:
        return null;
    }
  };
  
  const debtIconData = getDebtIconAndColor();
  
  // Убираем префикс [DEBT:type] из отображаемого описания
  const displayDescription = transaction.description?.replace(/\[DEBT:\w+\]\s*/, '');
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={isSelected ? [styles.glowContainer, { shadowColor: colors.primary }] : {}}>
        <TouchableOpacity
          style={[
            styles.content,
            { 
              backgroundColor: isLongPressed ? colors.primary + '10' : colors.card,
              borderColor: isSelected ? colors.primary : isLongPressed ? colors.primary : colors.border,
              borderWidth: isSelected ? 2.5 : isLongPressed ? 1.5 : 0,
            }
          ]}
          onPress={onPress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={500}
        >
        <View style={styles.leftSection}>
          {isSelectionMode ? (
            <View style={[styles.categoryIcon, { 
              backgroundColor: isSelected ? colors.primary : colors.card,
              borderWidth: isSelected ? 0 : 1,
              borderColor: colors.border,
            }]}>
              {isSelected && (
                <Ionicons name="checkmark" size={24} color="#fff" />
              )}
            </View>
          ) : isTransferTransaction ? (
            <View style={[styles.categoryIcon, { backgroundColor: '#2196F3' + '20' }]}>
              <Ionicons name="swap-horizontal" size={24} color="#2196F3" />
            </View>
          ) : debtIconData ? (
            <View style={[styles.categoryIcon, { backgroundColor: debtIconData.color + '20' }]}>
              <Ionicons name={debtIconData.icon as any} size={24} color={debtIconData.color} />
            </View>
          ) : category ? (
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={24} color={category.color} />
            </View>
          ) : (
            <View style={[styles.categoryIcon, { backgroundColor: colors.background }]}>
              <Ionicons 
                name={isIncome ? 'trending-up' : 'trending-down'} 
                size={24} 
                color={isIncome ? '#4CAF50' : colors.primary} 
              />
            </View>
          )}
          
          <View style={styles.info}>
            <Text style={[styles.categoryName, { color: colors.text }]}>
              {isTransferTransaction ? (
                t('transactions.transfer')
              ) : debtType ? (
                debtType === 'give' ? t('transactions.gaveLoan') :
                debtType === 'return' ? t('transactions.receivedLoan') :
                debtType === 'borrow' ? t('transactions.borrowedMoney') :
                t('transactions.paidBackDebt')
              ) : (category ? getLocalizedCategory(category, t).name : (isIncome ? t('transactions.income') : t('transactions.expense')))}
            </Text>
            {Boolean(displayDescription) && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                {displayDescription}
              </Text>
            )}
            {Boolean(account) && !isTransferTransaction && (
              <Text style={[styles.accountName, { color: colors.textSecondary }]}>
                {account?.name}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIncome ? '+' : '-'}{currencySymbol}{Math.abs(transaction.amount).toLocaleString()}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(transaction.date).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  glowContainer: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
  },
  accountName: {
    fontSize: 12,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
});

export const TransactionItem = React.memo(TransactionItemComponent); 