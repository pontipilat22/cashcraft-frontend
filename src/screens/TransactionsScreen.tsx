import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionActionsModal } from '../components/TransactionActionsModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { FAB } from '../components/FAB';
import { Transaction } from '../types';

export const TransactionsScreen = () => {
  const { colors } = useTheme();
  const { transactions, accounts, categories, totalBalance, isLoading, deleteTransaction } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Фильтрация транзакций по поиску
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter(transaction => {
      const category = categories.find(cat => cat.id === transaction.categoryId);
      const account = accounts.find(acc => acc.id === transaction.accountId);
      
      return (
        transaction.description?.toLowerCase().includes(query) ||
        category?.name.toLowerCase().includes(query) ||
        account?.name.toLowerCase().includes(query) ||
        transaction.amount.toString().includes(query)
      );
    });
  }, [transactions, searchQuery, categories, accounts]);

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
        dateKey = 'Сегодня';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Вчера';
      } else {
        dateKey = date.toLocaleDateString('ru-RU', {
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
  }, [filteredTransactions]);

  const handleLongPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionsModal(true);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    if (!selectedTransaction) return;
    
    Alert.alert(
      'Удалить транзакцию?',
      'Это действие нельзя отменить',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
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
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Поиск транзакций..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionAmount, { color: colors.textSecondary }]}>
        {(() => {
          const total = section.data.reduce((sum: number, t: Transaction) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
          }, 0);
          return `${total > 0 ? '+' : ''}₽${Math.abs(total).toLocaleString('ru-RU')}`;
        })()}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Transaction }) => {
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
  };

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
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Транзакции не найдены' : 'Нет транзакций'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchQuery 
                ? 'Попробуйте изменить поисковый запрос' 
                : 'Добавьте первую транзакцию'
              }
            </Text>
          </View>
        }
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyList : undefined}
        stickySectionHeadersEnabled={false}
      />

      <FAB onPress={() => setShowAddModal(true)} />

      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <TransactionActionsModal
        visible={showActionsModal}
        transaction={selectedTransaction}
        category={selectedTransaction ? categories.find(cat => cat.id === selectedTransaction.categoryId) : undefined}
        onClose={() => setShowActionsModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EditTransactionModal
        visible={showEditModal}
        transaction={selectedTransaction}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionAmount: {
    fontSize: 14,
    fontWeight: '500',
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