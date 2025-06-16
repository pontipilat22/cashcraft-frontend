import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction, Category } from '../types';
import { CURRENCIES } from '../config/currencies';

interface TransactionActionsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  category?: Category;
  account?: any; // Account type
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TransactionActionsModal: React.FC<TransactionActionsModalProps> = ({
  visible,
  transaction,
  category,
  account,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();

  if (!transaction) return null;

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  const isIncome = transaction.type === 'income';
  
  // Проверяем, является ли транзакция переводом
  const isTransfer = (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense') 
    && transaction.description?.match(/[→←]/);
  
  // Определяем тип долговой операции
  const getDebtType = (description?: string) => {
    if (!description) return null;
    const match = description.match(/\[DEBT:(give|return|borrow|payback)\]/);
    if (match) return match[1];
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
  
  // Определяем валюту счета
  const accountCurrency = account?.currency || defaultCurrency;
  const currencySymbol = CURRENCIES[accountCurrency]?.symbol || CURRENCIES[defaultCurrency]?.symbol || '$';
  
  const amount = `${currencySymbol}${transaction.amount.toLocaleString()}`;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const transactionDate = new Date(transaction.date);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.bottomSheet}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.container, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Индикатор для свайпа */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            
            {/* Заголовок */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Детали операции</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            >
              {/* Основная информация */}
              <View style={styles.mainInfo}>
                <View style={styles.amountSection}>
                  {isTransfer ? (
                    <View style={[styles.categoryIcon, { backgroundColor: '#2196F3' + '20' }]}>
                      <Ionicons name="swap-horizontal" size={32} color="#2196F3" />
                    </View>
                  ) : debtIconData ? (
                    <View style={[styles.categoryIcon, { backgroundColor: debtIconData.color + '20' }]}>
                      <Ionicons name={debtIconData.icon as any} size={32} color={debtIconData.color} />
                    </View>
                  ) : category ? (
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <Ionicons name={category.icon as any} size={32} color={category.color} />
                    </View>
                  ) : (
                    <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons 
                        name={isIncome ? 'trending-up' : 'trending-down'} 
                        size={32} 
                        color={isIncome ? '#4CAF50' : colors.primary} 
                      />
                    </View>
                  )}
                  <View style={styles.amountText}>
                    <Text style={[styles.amount, { color: isIncome ? '#4CAF50' : colors.text }]}>
                      {isIncome ? '+' : '-'}{amount}
                    </Text>
                    <Text style={[styles.categoryName, { color: colors.textSecondary }]}>
                      {isTransfer ? (
                        t('transactions.transfer')
                      ) : debtType ? (
                        debtType === 'give' ? 'Дал в долг' :
                        debtType === 'return' ? 'Получил долг' :
                        debtType === 'borrow' ? 'Взял в долг' :
                        'Вернул долг'
                      ) : (category?.name || (isIncome ? t('transactions.income') : t('transactions.expense')))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Детальная информация */}
              <View style={styles.details}>
                {/* Описание */}
                {displayDescription && (
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Описание</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{displayDescription}</Text>
                    </View>
                  </View>
                )}

                {/* Счет */}
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="wallet-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Счёт</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {account?.name || 'Неизвестный счёт'}
                    </Text>
                  </View>
                </View>

                {/* Дата */}
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Дата</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(transactionDate)}
                    </Text>
                  </View>
                </View>

                {/* Время */}
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Время</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatTime(transactionDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Действия */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={handleEdit}
                >
                  <Ionicons name="pencil" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Редактировать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: 'transparent',
    maxHeight: '95%',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  mainInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  amountText: {
    flex: 1,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
  },
  details: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 