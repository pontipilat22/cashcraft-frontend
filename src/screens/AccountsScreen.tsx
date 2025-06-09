import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { AccountSection } from '../components/AccountSection';
import { AccountCard } from '../components/AccountCard';
import { FABMenu } from '../components/FABMenu';
import { AddAccountModal } from '../components/AddAccountModal';
import { EditAccountModal } from '../components/EditAccountModal';
import { AccountTypeSelector } from '../components/AccountTypeSelector';
import { AccountActionsModal } from '../components/AccountActionsModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AccountType, Account, Debt } from '../types';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { DebtOperationModal } from '../components/DebtOperationModal';
import { DebtTypeSelector } from '../components/DebtTypeSelector';
import { StackNavigationProp } from '@react-navigation/stack';
import { AccountsStackParamList } from '../navigation/AccountsNavigator';
import { DatabaseService } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';

type AccountsScreenNavigationProp = StackNavigationProp<AccountsStackParamList, 'AccountsMain'>;

interface AccountsScreenProps {
  navigation: AccountsScreenNavigationProp;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, getStatistics } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtOperationType, setDebtOperationType] = useState<'give' | 'return' | 'borrow' | 'payback' | null>(null);
  const [showDebtOperationModal, setShowDebtOperationModal] = useState(false);
  const [showDebtTypeSelector, setShowDebtTypeSelector] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>('cash');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [sectionToAdd, setSectionToAdd] = useState<'cards' | 'savings' | 'debts' | 'credits'>('cards');

  const stats = getStatistics();

  // Загружаем долги при фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      loadDebts();
      
      // Добавляем слушатель для обновления долгов
      const unsubscribe = navigation.addListener('focus', () => {
        loadDebts();
      });
      
      return unsubscribe;
    }, [navigation])
  );

  // Следим за изменениями в DataContext для обновления долгов при сбросе
  useEffect(() => {
    // Проверяем признаки сброса данных
    if (accounts.length === 1 && accounts[0].name === 'Наличные' && accounts[0].balance === 0) {
      // Небольшая задержка чтобы БД успела обновиться
      setTimeout(() => {
        loadDebts();
      }, 100);
    }
  }, [accounts]);

  const loadDebts = async () => {
    const allDebts = await DatabaseService.getDebts();
    setDebts(allDebts);
  };

  // Считаем суммы долгов
  const debtTotals = useMemo(() => {
    const owed = debts.filter(d => d.type === 'owed').reduce((sum, d) => sum + d.amount, 0);
    const owe = debts.filter(d => d.type === 'owe').reduce((sum, d) => sum + d.amount, 0);
    return { owed, owe };
  }, [debts]);

  // Группируем счета по типам
  const groupedAccounts = {
    cards: accounts.filter(a => a.type === 'cash' || a.type === 'card'),
    savings: accounts.filter(a => a.type === 'savings'),
    debts: accounts.filter(a => a.type === 'debt'),
    credits: accounts.filter(a => a.type === 'credit'),
  };

  const handleAddAccount = (section: 'cards' | 'savings' | 'debts' | 'credits') => {
    setSectionToAdd(section);
    
    if (section === 'cards') {
      // Для карт и счетов показываем селектор типа
      setTypeSelectorVisible(true);
    } else if (section === 'debts') {
      // Для долгов открываем селектор типов
      setShowDebtTypeSelector(true);
    } else {
      // Для остальных сразу открываем модальное окно
      const typeMap = {
        savings: 'savings' as AccountType,
        debts: 'debt' as AccountType,
        credits: 'credit' as AccountType,
      };
      setSelectedAccountType(typeMap[section]);
      setModalVisible(true);
    }
  };

  const handleTypeSelect = (type: 'cash' | 'card' | 'bank') => {
    setSelectedAccountType(type);
    setModalVisible(true);
  };

  const handleSaveAccount = async (data: { 
    name: string; 
    balance: number; 
    cardNumber?: string;
    isDefault?: boolean;
    isIncludedInTotal?: boolean;
    icon?: string;
    targetAmount?: number;
  }) => {
    try {
      // Если новый счет должен быть по умолчанию, снимаем флаг с предыдущего
      if (data.isDefault) {
        const currentDefault = accounts.find(acc => acc.isDefault);
        if (currentDefault) {
          await updateAccount(currentDefault.id, {
            ...currentDefault,
            isDefault: false
          });
        }
      }
      
      await createAccount({
        ...data,
        type: selectedAccountType
      });
      setModalVisible(false);
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleUpdateAccount = async (accountId: string, data: { 
    name: string; 
    balance: number; 
    cardNumber?: string;
    isDefault?: boolean;
    isIncludedInTotal?: boolean;
  }) => {
    try {
      // Если счет становится по умолчанию, снимаем флаг с предыдущего
      if (data.isDefault) {
        const currentDefault = accounts.find(acc => acc.isDefault && acc.id !== accountId);
        if (currentDefault) {
          await updateAccount(currentDefault.id, {
            ...currentDefault,
            isDefault: false
          });
        }
      }

      await updateAccount(accountId, data);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    
    Alert.alert(
      'Удалить счет',
      `Вы уверены, что хотите удалить "${selectedAccount.name}"?`,
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
              await deleteAccount(selectedAccount.id);
              setActionsModalVisible(false);
            } catch (error) {
              console.error('Error deleting account:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleAccountLongPress = (account: Account) => {
    setSelectedAccount(account);
    setActionsModalVisible(true);
  };

  const handleEditAccount = () => {
    setEditModalVisible(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
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

  const formatAccountName = (account: Account) => {
    if (!account) return '';
    if (account.cardNumber) {
      return `${String(account.name || '')} •••• ${String(account.cardNumber || '')}`;
    }
    return String(account.name || '');
  };

  const handleQuickIncome = () => {
    setTransactionType('income');
    setTransactionModalVisible(true);
  };

  const handleQuickExpense = () => {
    setTransactionType('expense');
    setTransactionModalVisible(true);
  };

  const handleQuickDebt = () => {
    setShowDebtTypeSelector(true);
  };

  const handleDebtTypeSelect = (type: 'give' | 'return' | 'borrow' | 'payback') => {
    setDebtOperationType(type);
    setShowDebtOperationModal(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.statsCard, { backgroundColor: colors.statsBg }]}>
          <Text style={styles.statsTitle}>Статистика за период</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="arrow-down" size={24} color="#fff" />
              <Text style={styles.statLabel}>Расходы</Text>
              <Text style={styles.statAmount}>{stats.expense.toLocaleString('ru-RU')} ₽</Text>
            </View>
            <View style={styles.statDivider}></View>
            <View style={styles.statItem}>
              <Ionicons name="arrow-up" size={24} color="#fff" />
              <Text style={styles.statLabel}>Доходы</Text>
              <Text style={styles.statAmount}>{stats.income.toLocaleString('ru-RU')} ₽</Text>
            </View>
          </View>
        </View>

        <AccountSection 
          title="Карты и счета"
          count={groupedAccounts.cards.length}
          onAddPress={() => handleAddAccount('cards')}
        >
          {Array.isArray(groupedAccounts.cards) && groupedAccounts.cards.length > 0
            ? groupedAccounts.cards.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => {}}
                  onLongPress={() => handleAccountLongPress(account)}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>Нет счетов</Text>}
        </AccountSection>

        <AccountSection 
          title="Накопления"
          count={groupedAccounts.savings.length}
          onAddPress={() => handleAddAccount('savings')}
        >
          {Array.isArray(groupedAccounts.savings) && groupedAccounts.savings.length > 0
            ? groupedAccounts.savings.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => {}}
                  onLongPress={() => handleAccountLongPress(account)}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>Нет накоплений</Text>}
        </AccountSection>

        <AccountSection 
          title="Долги"
          count={debts.length}
          onAddPress={() => handleAddAccount('debts')}
        >
          {debts.length === 0 ? (
            <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>Нет долгов</Text>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity 
                style={[styles.debtCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('DebtList', { type: 'owed' })}
              >
                <Ionicons name="trending-up-outline" size={32} color={colors.primary} />
                <View style={styles.debtCardContent}>
                  <Text style={[styles.debtCardTitle, { color: colors.text }]}>Мне должны</Text>
                  <Text style={[styles.debtCardAmount, { color: colors.primary }]}>
                    {debtTotals.owed.toLocaleString('ru-RU')} ₽
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.debtCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('DebtList', { type: 'owe' })}
              >
                <Ionicons name="trending-down-outline" size={32} color={colors.primary} />
                <View style={styles.debtCardContent}>
                  <Text style={[styles.debtCardTitle, { color: colors.text }]}>Я должен</Text>
                  <Text style={[styles.debtCardAmount, { color: colors.primary }]}>
                    {debtTotals.owe.toLocaleString('ru-RU')} ₽
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </AccountSection>

        <AccountSection 
          title="Кредиты"
          count={groupedAccounts.credits.length}
          onAddPress={() => handleAddAccount('credits')}
        >
          {Array.isArray(groupedAccounts.credits) && groupedAccounts.credits.length > 0
            ? groupedAccounts.credits.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => {}}
                  onLongPress={() => handleAccountLongPress(account)}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>Нет кредитов</Text>}
        </AccountSection>

        <View style={{ height: 100 }}></View>
      </ScrollView>

      <FABMenu
        onIncomePress={handleQuickIncome}
        onExpensePress={handleQuickExpense}
        onDebtPress={handleQuickDebt}
      />

      <AccountTypeSelector
        visible={typeSelectorVisible}
        onClose={() => setTypeSelectorVisible(false)}
        onSelect={handleTypeSelect}
      />

      <AddAccountModal
        visible={modalVisible}
        accountType={selectedAccountType}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveAccount}
      />

      <EditAccountModal
        visible={editModalVisible}
        account={selectedAccount}
        onClose={() => setEditModalVisible(false)}
        onSave={handleUpdateAccount}
      />

      <AccountActionsModal
        visible={actionsModalVisible}
        accountName={selectedAccount?.name || ''}
        onClose={() => setActionsModalVisible(false)}
        onEdit={handleEditAccount}
        onDelete={handleDeleteAccount}
      />

      <AddTransactionModal
        visible={transactionModalVisible}
        onClose={() => setTransactionModalVisible(false)}
        initialType={transactionType}
      />

      <DebtTypeSelector
        visible={showDebtTypeSelector}
        onClose={() => setShowDebtTypeSelector(false)}
        onSelect={handleDebtTypeSelect}
      />

      <DebtOperationModal
        visible={showDebtOperationModal}
        operationType={debtOperationType}
        onClose={() => {
          setShowDebtOperationModal(false);
          setDebtOperationType(null);
        }}
        onOperationComplete={() => {
          loadDebts();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  statAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debtCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  debtCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  debtCardAmount: {
    fontSize: 14,
    marginTop: 4,
  },
}); 