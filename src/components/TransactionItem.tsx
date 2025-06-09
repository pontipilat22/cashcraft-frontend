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
import { Transaction, Category, Account } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction, 
  category,
  account,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
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
      <TouchableOpacity
        style={[
          styles.content,
          { 
            backgroundColor: isLongPressed ? colors.primary + '20' : colors.card,
            borderColor: isLongPressed ? colors.primary : colors.border,
            borderWidth: isLongPressed ? 1 : 0,
          }
        ]}
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={500}
      >
        <View style={styles.leftSection}>
          {debtIconData ? (
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
              {debtType ? (
                debtType === 'give' ? 'Дал в долг' :
                debtType === 'return' ? 'Получил долг' :
                debtType === 'borrow' ? 'Взял в долг' :
                'Вернул долг'
              ) : (category?.name || (isIncome ? 'Доход' : 'Расход'))}
            </Text>
            {Boolean(displayDescription) && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                {displayDescription}
              </Text>
            )}
            {Boolean(account) && (
              <Text style={[styles.accountName, { color: colors.textSecondary }]}>
                {account?.name}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIncome ? '+' : '-'}₽{Math.abs(transaction.amount).toLocaleString('ru-RU')}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(transaction.date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
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