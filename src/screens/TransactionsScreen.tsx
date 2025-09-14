import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionActionsModal } from '../components/TransactionActionsModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { NewFABMenu } from '../components/NewFABMenu';
import { DebtOperationModal } from '../components/DebtOperationModal';
import { DebtTypeSelector } from '../components/DebtTypeSelector';
import { TransferModal } from '../components/TransferModal';
import { Transaction } from '../types/index';
import { useLocalization } from '../context/LocalizationContext';
import { getCurrentLanguage } from '../services/i18n';
import { CURRENCIES } from '../config/currencies';
import { SectionHeader } from '../components/SectionHeader';
import { DateRangePicker } from '../components/DateRangePicker';
import { DateFilterModal } from '../components/DateFilterModal';

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

// Отдельный компонент для заголовка списка
const ListHeader = React.memo(({ 
  dateFilter,
  customStartDate,
  customEndDate,
  onDateFilterChange,
  onShowDateRangePicker,
  onShowMoreFilters
}: {
  dateFilter: string;
  customStartDate: Date;
  customEndDate: Date;
  onDateFilterChange: (filter: string) => void;
  onShowDateRangePicker: () => void;
  onShowMoreFilters: () => void;
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const isCustomActive = dateFilter === 'week' || dateFilter === 'month' || dateFilter === 'custom';

  return (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: t('transactions.allTransactions') },
        { key: 'today', label: t('transactions.todayTransactions') },
        { key: 'yesterday', label: t('transactions.yesterdayTransactions') },
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            { 
              backgroundColor: dateFilter === filter.key ? colors.primary : colors.card,
              borderColor: dateFilter === filter.key ? colors.primary : colors.border,
            }
          ]}
          onPress={() => onDateFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.filterText,
              { color: dateFilter === filter.key ? '#fff' : colors.text }
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[
          styles.filterButton,
          styles.moreFiltersButton,
          { 
            backgroundColor: isCustomActive ? colors.primary : colors.card,
            borderColor: isCustomActive ? colors.primary : colors.border,
          }
        ]}
        onPress={onShowMoreFilters}
      >
        <Ionicons 
          name="options-outline"
          size={16} 
          color={isCustomActive ? '#fff' : colors.text} 
        />
        <Text
          style={[
            styles.filterText,
            { color: isCustomActive ? '#fff' : colors.text }
          ]}
        >
          {t('common.more')}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export const TransactionsScreen = () => {
  const { colors } = useTheme();
  const { transactions, accounts, categories, totalBalance, isLoading, deleteTransaction, refreshData } = useData();
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
  
  // Состояния для режима выделения
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Состояния для фильтра по дням
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);

  const handleDateFilterChange = (filter: string) => {
    setDateFilter(filter as 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom');
  };

  // Используем debounce для поиска
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Состояние для отложенной загрузки
  const [isFilteringTransactions, setIsFilteringTransactions] = useState(false);

  // Обновляем данные при фокусе экрана (для синхронизации между вкладками)
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

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
    
    // Фильтрация по дате
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      result = result.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return transactionDateOnly.getTime() === today.getTime();
          case 'yesterday':
            return transactionDateOnly.getTime() === yesterday.getTime();
          case 'week':
            return transactionDate >= weekAgo;
          case 'month':
            return transactionDate >= monthAgo;
          case 'custom':
            const startDateOnly = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate());
            const endDateOnly = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate());
            endDateOnly.setHours(23, 59, 59, 999); // Включаем весь последний день
            return transactionDate >= startDateOnly && transactionDate <= endDateOnly;
          default:
            return true;
        }
      });
    }
    
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
  }, [transactions, debouncedSearchQuery, categories, accounts, dateFilter, customStartDate, customEndDate]);

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

  const toggleTransactionSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedIds(new Set());
  }, []);
  
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  
  const handleLongPress = useCallback((transaction: Transaction) => {
    if (!isSelectionMode) {
      // При долгом нажатии активируем режим выделения
      enterSelectionMode();
      toggleTransactionSelection(transaction.id);
    }
  }, [isSelectionMode, enterSelectionMode, toggleTransactionSelection]);
  
  const handleTransactionPress = useCallback((transaction: Transaction) => {
    if (isSelectionMode) {
      toggleTransactionSelection(transaction.id);
    } else {
      // При обычном клике открываем детали транзакции
      setSelectedTransaction(transaction);
      setShowActionsModal(true);
    }
  }, [isSelectionMode, toggleTransactionSelection]);
  
  const deleteSelectedTransactions = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    Alert.alert(
      t('transactions.deleteTransaction'),
      `${t('transactions.deleteSelectedConfirm')} (${selectedIds.size})?`,
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
              console.log('🗑️ [TransactionsScreen] Начинаем удаление выбранных транзакций:', Array.from(selectedIds));
              for (const id of selectedIds) {
                console.log('🗑️ [TransactionsScreen] Удаляем транзакцию:', id);
                await deleteTransaction(id);
              }
              console.log('✅ [TransactionsScreen] Все транзакции успешно удалены');
              exitSelectionMode();
            } catch (error) {
              console.error('❌ [TransactionsScreen] Ошибка удаления транзакций:', error);
              Alert.alert(
                t('common.error'),
                t('transactions.deleteError') || 'Ошибка при удалении транзакций'
              );
            }
          },
        },
      ]
    );
  }, [selectedIds, t, deleteTransaction, exitSelectionMode]);

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
              console.log('🗑️ [TransactionsScreen] Удаляем транзакцию:', selectedTransaction.id);
              await deleteTransaction(selectedTransaction.id);
              console.log('✅ [TransactionsScreen] Транзакция успешно удалена');
              setShowActionsModal(false);
            } catch (error) {
              console.error('❌ [TransactionsScreen] Ошибка удаления транзакции:', error);
              Alert.alert(
                t('common.error'),
                t('transactions.deleteError') || 'Ошибка при удалении транзакции'
              );
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

  const ListHeaderComponent = useCallback(() => {
    return (
      <ListHeader 
        dateFilter={dateFilter}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onDateFilterChange={handleDateFilterChange}
        onShowDateRangePicker={() => {
          setShowDateFilterModal(false);
          setShowDateRangePicker(true);
        }}
        onShowMoreFilters={() => setShowDateFilterModal(true)}
      />
    );
  }, [dateFilter, customStartDate, customEndDate]);

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
        onPress={() => handleTransactionPress(item)}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={isSelectionMode}
      />
    );
  }, [categories, accounts, handleLongPress, handleTransactionPress, selectedIds, isSelectionMode]);

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
      {/* Поиск и кнопка удаления в одной строке */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('transactions.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {!isSelectionMode ? (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.card }]}
            onPress={enterSelectionMode}
          >
            <Ionicons name="trash-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionButton, { backgroundColor: colors.card }]}
              onPress={exitSelectionMode}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                style={[styles.selectionButton, { backgroundColor: colors.danger || '#FF3B30' }]}
                onPress={deleteSelectedTransactions}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deleteCount}>{selectedIds.size}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <SectionList
        ListHeaderComponent={ListHeaderComponent}
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
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        getItemLayout={useCallback((data: any, index: number) => ({
          length: 80,
          offset: 80 * index + 44 * Math.floor(index / 10),
          index,
        }), [])}
        onScrollToIndexFailed={useCallback(() => {}, [])}
      />

      {!isSelectionMode && (
        <NewFABMenu
          onIncomePress={handleQuickIncome}
          onExpensePress={handleQuickExpense}
          onTransferPress={handleQuickTransfer}
          onDebtPress={handleQuickDebt}
          onAddAccountPress={() => {
          }}
        />
      )}

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

      <DateFilterModal 
        visible={showDateFilterModal}
        onClose={() => setShowDateFilterModal(false)}
        currentFilter={dateFilter}
        onSelectFilter={(filter) => {
          setShowDateFilterModal(false);
          if (filter === 'custom') {
            setShowDateRangePicker(true);
          } else {
            handleDateFilterChange(filter);
          }
        }}
      />

      <DateRangePicker
        visible={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onConfirm={(startDate, endDate) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
          handleDateFilterChange('custom');
          setShowDateRangePicker(false);
        }}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />
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
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  deleteButton: {
    flexShrink: 0,
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionActions: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    padding: 12,
    borderRadius: 12,
    minWidth: 44,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
  },
  moreFiltersButton: {
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
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