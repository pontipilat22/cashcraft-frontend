import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { AccountSection } from '../components/AccountSection';
import { AccountCard } from '../components/AccountCard';
import { FAB } from '../components/FAB';
import { AddAccountModal } from '../components/AddAccountModal';
import { EditAccountModal } from '../components/EditAccountModal';
import { AccountTypeSelector } from '../components/AccountTypeSelector';
import { AccountActionsModal } from '../components/AccountActionsModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AccountType, Account } from '../types';
import { AddTransactionModal } from '../components/AddTransactionModal';

export const AccountsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, getStatistics } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>('cash');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [sectionToAdd, setSectionToAdd] = useState<'cards' | 'savings' | 'debts' | 'credits'>('cards');

  const stats = getStatistics();

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
          count={groupedAccounts.debts.length}
          onAddPress={() => handleAddAccount('debts')}
        >
          {Array.isArray(groupedAccounts.debts) && groupedAccounts.debts.length > 0
            ? groupedAccounts.debts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => {}}
                  onLongPress={() => handleAccountLongPress(account)}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>Нет долгов</Text>}
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

      <FAB onPress={() => setTransactionModalVisible(true)} />

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
}); 