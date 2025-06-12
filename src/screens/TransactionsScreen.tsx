import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionActionsModal } from '../components/TransactionActionsModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { FABMenu } from '../components/FABMenu';
import { DebtOperationModal } from '../components/DebtOperationModal';
import { DebtTypeSelector } from '../components/DebtTypeSelector';
import { TransferModal } from '../components/TransferModal';
import { Transaction } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { getCurrentLanguage } from '../services/i18n';
import { CURRENCIES } from '../config/currencies';
import { SectionHeader } from '../components/SectionHeader';

// Хук для debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const TransactionsScreen = () => {
  const { colors } = useTheme();
  const { transactions, accounts, categories, totalBalance, isLoading, deleteTransaction } = useData();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const currentLanguage = getCurrentLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [debtOperationType, setDebtOperationType] = useState<'give' | 'return' | 'borrow' | 'payback' | null>(null);
  const [showDebtOperationModal, setShowDebtOperationModal] = useState(false);
  const [showDebtTypeSelector, setShowDebtTypeSelector] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Используем debounce для поиска
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Состояние для отложенной загрузки
  const [isFilteringTransactions, setIsFilteringTransactions] = useState(false);

  // Фильтрация и объединение парных транзакций переводов
  const filteredTransactions = useMemo(() => {
    // Для больших списков откладываем фильтрацию
    if (transactions.length > 500 && debouncedSearchQuery.trim()) {
      setIsFilteringTransactions(true);
      InteractionManager.runAfterInteractions(() => {
        setIsFilteringTransactions(false);
      });
    }

    let result = [...transactions];
    
    // Объединяем парные транзакции переводов
    const transferPairs = new Map<string, Transaction[]>();
    const processedIds = new Set<string>();
    
    result.forEach(transaction => {
      if (processedIds.has(transaction.id)) return;
      
      // Проверяем, является ли это переводом
      const isTransfer = (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense') 
        && transaction.description?.match(/[→←]/);
      
      if (isTransfer) {
        // Ищем парную транзакцию
        const pairTransaction = result.find(t => 
          t.id !== transaction.id &&
          !processedIds.has(t.id) &&
          Math.abs(new Date(t.date).getTime() - new Date(transaction.date).getTime()) < 1000 && // В пределах 1 секунды
          ((transaction.type === 'expense' && t.type === 'income') || 
           (transaction.type === 'income' && t.type === 'expense')) &&
          (t.categoryId === 'other_income' || t.categoryId === 'other_expense')
        );
        
        if (pairTransaction) {
          // Помечаем обе транзакции как обработанные
          processedIds.add(transaction.id);
          processedIds.add(pairTransaction.id);
          
          // Оставляем только расходную транзакцию для отображения
          const expenseTransaction = transaction.type === 'expense' ? transaction : pairTransaction;
          transferPairs.set(expenseTransaction.id, [expenseTransaction, pairTransaction]);
        }
      }
    });
    
    // Фильтруем результат, исключая обработанные доходные транзакции переводов
    result = result.filter(t => {
      if (processedIds.has(t.id) && t.type === 'income') {
        return false; // Скрываем доходные транзакции переводов
      }
      return true;
    });
    
    // Применяем поисковый фильтр
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(transaction => {
        const category = categories.find(cat => cat.id === transaction.categoryId);
        const account = accounts.find(acc => acc.id === transaction.accountId);
        
        return (
          transaction.description?.toLowerCase().includes(query) ||
          category?.name.toLowerCase().includes(query) ||
          account?.name.toLowerCase().includes(query) ||
          transaction.amount.toString().includes(query)
        );
      });
    }
    
    return result;
  }, [transactions, debouncedSearchQuery, categories, accounts]);

  // Группировка транзакций по дням
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = t('transactions.today');
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = t('transactions.yesterday');
      } else {
        dateKey = date.toLocaleDateString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });
    
    return Object.entries(groups).map(([date, items]) => ({
      title: date,
      data: items,
    }));
  }, [filteredTransactions, t, currentLanguage]);

  const handleLongPress = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionsModal(true);
  }, []);

  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedTransaction) return;
    
    Alert.alert(
      t('transactions.deleteTransaction'),
      t('transactions.deleteTransactionConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(selectedTransaction.id);
            } catch (error) {
              console.error('Error deleting transaction:', error);
            }
          },
        },
      ]
    );
  }, [selectedTransaction, t, deleteTransaction]);

  const handleQuickIncome = useCallback(() => {
    setTransactionType('income');
    setShowAddModal(true);
  }, []);

  const handleQuickExpense = useCallback(() => {
    setTransactionType('expense');
    setShowAddModal(true);
  }, []);

  const handleQuickDebt = useCallback(() => {
    setShowDebtTypeSelector(true);
  }, []);

  const handleQuickTransfer = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  const handleDebtTypeSelect = useCallback((type: 'give' | 'return' | 'borrow' | 'payback') => {
    setDebtOperationType(type);
    setShowDebtOperationModal(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderHeader = useCallback(() => (
    <View>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('transactions.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [colors, t, searchQuery, clearSearch]);

  const renderSectionHeader = useCallback(({ section }: { section: any }) => {
    return <SectionHeader title={section.title} data={section.data} />;
  }, []);

  const renderItem = useCallback(({ item }: { item: Transaction }) => {
    const category = categories.find(cat => cat.id === item.categoryId);
    const account = accounts.find(acc => acc.id === item.accountId);
    
    return (
      <TransactionItem
        transaction={item}
        category={category}
        account={account}
        onLongPress={() => handleLongPress(item)}
      />
    );
  }, [categories, accounts, handleLongPress]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {debouncedSearchQuery ? t('transactions.notFound') : t('transactions.noTransactions')}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        {debouncedSearchQuery 
          ? t('transactions.changeSearchQuery') 
          : t('transactions.addFirstTransaction')
        }
      </Text>
    </View>
  ), [colors, debouncedSearchQuery, t]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        ListHeaderComponent={renderHeader}
        sections={groupedTransactions}
        keyExtractor={useCallback((item: Transaction) => item.id, [])}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyList : undefined}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        getItemLayout={useCallback((data: any, index: number) => ({
          length: 80, // Уменьшенная высота элемента для более точного расчета
          offset: 80 * index + 44 * Math.floor(index / 10), // Учитываем высоту заголовков секций
          index,
        }), [])}
        onScrollToIndexFailed={useCallback(() => {
          // Обработка ошибок при прокрутке к элементу
        }, [])}
      />

      <FABMenu
        onIncomePress={handleQuickIncome}
        onExpensePress={handleQuickExpense}
        onDebtPress={handleQuickDebt}
        onTransferPress={handleQuickTransfer}
      />

      {showAddModal && (
        <AddTransactionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          initialType={transactionType}
        />
      )}
      
      {showTransferModal && (
        <TransferModal
          visible={showTransferModal}
          onClose={() => setShowTransferModal(false)}
        />
      )}
      
      {showDebtTypeSelector && (
        <DebtTypeSelector
          visible={showDebtTypeSelector}
          onClose={() => setShowDebtTypeSelector(false)}
          onSelect={handleDebtTypeSelect}
        />
      )}
      
      {showDebtOperationModal && (
        <DebtOperationModal
          visible={showDebtOperationModal}
          operationType={debtOperationType}
          onClose={() => {
            setShowDebtOperationModal(false);
            setDebtOperationType(null);
          }}
        />
      )}

      {showActionsModal && selectedTransaction && (
        <TransactionActionsModal
          visible={showActionsModal}
          transaction={selectedTransaction}
          category={selectedTransaction ? categories.find(cat => cat.id === selectedTransaction.categoryId) : undefined}
          account={selectedTransaction ? accounts.find(acc => acc.id === selectedTransaction.accountId) : undefined}
          onClose={() => setShowActionsModal(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showEditModal && selectedTransaction && (
        <EditTransactionModal
          visible={showEditModal}
          transaction={selectedTransaction}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
}); 