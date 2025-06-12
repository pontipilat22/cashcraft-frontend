import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
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
import { LocalDatabaseService } from '../services/localDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { TransferModal } from '../components/TransferModal';

type AccountsScreenNavigationProp = StackNavigationProp<AccountsStackParamList, 'AccountsMain'>;

interface AccountsScreenProps {
  navigation: AccountsScreenNavigationProp;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, getStatistics } = useData();
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { t } = useLocalization();
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [showDebtTypeSelector, setShowDebtTypeSelector] = useState(false);
  const [showDebtOperationModal, setShowDebtOperationModal] = useState(false);
  const [debtOperationType, setDebtOperationType] = useState<'give' | 'return' | 'borrow' | 'payback' | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>('cash');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [sectionToAdd, setSectionToAdd] = useState<'cards' | 'savings' | 'debts' | 'credits'>('cards');
  const [debts, setDebts] = useState<Debt[]>([]);

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
    const allDebts = await LocalDatabaseService.getDebts();
    setDebts(allDebts);
  };

  // Считаем суммы долгов
  const debtTotals = useMemo(() => {
    const owed = debts.filter(d => d.type === 'owed_to_me').reduce((sum, d) => sum + d.amount, 0);
    const owe = debts.filter(d => d.type === 'owed_by_me').reduce((sum, d) => sum + d.amount, 0);
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
    // Проверка лимита для бесплатных пользователей
    if (!isPremium) {
      let limitReached = false;
      let accountLimit = 0;
      let currentCount = 0;
      
      // Определяем лимиты и считаем текущее количество для каждого типа
      switch (section) {
        case 'cards':
          accountLimit = 2; // Лимит 2 для карт и счетов
          currentCount = groupedAccounts.cards.length;
          limitReached = currentCount >= accountLimit;
          break;
        case 'savings':
          accountLimit = 1; // Лимит 1 для накоплений
          currentCount = groupedAccounts.savings.length;
          limitReached = currentCount >= accountLimit;
          break;
        case 'debts':
        case 'credits':
          // Долги и кредиты без ограничений
          limitReached = false;
          break;
      }
      
      if (limitReached) {
        const isGuest = user?.isGuest;
        
        if (isGuest) {
          Alert.alert(
            t('accounts.authRequired'),
            t('accounts.guestLimitMessage'),
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
              },
              {
                text: t('accounts.signIn'),
                onPress: () => {
                  // Выходим из гостевого режима
                  navigation.navigate('More' as any);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            t('accounts.limitReached'),
            t('accounts.freeLimitMessage'),
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
              },
              {
                text: t('accounts.getPremium'),
                onPress: () => {
                  // Открываем экран подписки через MoreScreen
                  navigation.navigate('More' as any);
                },
              },
            ]
          );
        }
        return;
      }
    }

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
    creditStartDate?: string;
    creditTerm?: number;
    creditRate?: number;
    creditPaymentType?: 'annuity' | 'differentiated';
    creditInitialAmount?: number;
    [key: string]: any; // Для остальных полей
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
      t('accounts.deleteAccount'),
      `${t('accounts.deleteAccountConfirm')} "${selectedAccount.name}"?`,
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

  const handleQuickTransfer = () => {
    // Проверяем количество счетов
    if (accounts.length < 2) {
      Alert.alert(
        t('transactions.transfer'),
        t('accounts.needTwoAccountsForTransfer') || 'Для перевода необходимо иметь минимум два счета',
        [
          {
            text: t('common.close') || 'Закрыть',
            style: 'cancel'
          },
          {
            text: t('accounts.openAccount') || 'Открыть счет',
            onPress: () => {
              // Открываем селектор типа счета для создания нового
              setTypeSelectorVisible(true);
            }
          }
        ]
      );
      return;
    }
    setShowTransferModal(true);
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
        <View style={[styles.statsCard, { 
          backgroundColor: colors.statsBg,
          shadowColor: isDark ? '#000' : '#b0b0b0',
          shadowOffset: { width: 10, height: 10 },
          shadowOpacity: isDark ? 0.7 : 0.4,
          shadowRadius: 20,
          elevation: 15,
        }]}>
          <Text style={styles.statsTitle}>{t('accounts.statsForPeriod')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="arrow-down" size={24} color="#fff" />
              <Text style={styles.statLabel}>{t('accounts.expenses')}</Text>
              <Text style={styles.statAmount}>{stats.expense.toLocaleString('ru-RU')} ₽</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="arrow-up" size={24} color="#fff" />
              <Text style={styles.statLabel}>{t('accounts.income')}</Text>
              <Text style={styles.statAmount}>{stats.income.toLocaleString('ru-RU')} ₽</Text>
            </View>
          </View>
        </View>

        <AccountSection 
          title={t('accounts.cardsAndAccounts')}
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
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noAccounts')}</Text>}
        </AccountSection>

        <AccountSection 
          title={t('accounts.savingsAccounts')}
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
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noSavings')}</Text>}
        </AccountSection>

        <AccountSection 
          title={t('accounts.debts')}
          count={debts.length > 0 ? 2 : 0}
          onAddPress={() => handleAddAccount('debts')}
        >
          {debts.length === 0 ? (
            <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noDebts')}</Text>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity 
                style={[styles.debtCard, { 
                  backgroundColor: isDark ? colors.card : '#f5f5f5',
                  shadowColor: isDark ? '#000' : '#b0b0b0',
                  shadowOffset: { width: 8, height: 8 },
                  shadowOpacity: isDark ? 0.7 : 0.4,
                  shadowRadius: 15,
                  elevation: 12,
                }]}
                onPress={() => navigation.navigate('DebtList')}
              >
                <View style={[styles.debtIconContainer, {
                  backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8',
                  shadowColor: isDark ? '#000' : '#a0a0a0',
                  shadowOffset: { width: 4, height: 4 },
                  shadowOpacity: isDark ? 0.6 : 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                }]}>
                  <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.debtCardContent}>
                  <Text style={[styles.debtCardTitle, { color: colors.text }]}>{t('accounts.owedToMe')}</Text>
                  <Text style={[styles.debtCardAmount, { color: colors.primary }]}>
                    {debtTotals.owed.toLocaleString('ru-RU')} ₽
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.debtCard, { 
                  backgroundColor: isDark ? colors.card : '#f5f5f5',
                  shadowColor: isDark ? '#000' : '#b0b0b0',
                  shadowOffset: { width: 8, height: 8 },
                  shadowOpacity: isDark ? 0.7 : 0.4,
                  shadowRadius: 15,
                  elevation: 12,
                }]}
                onPress={() => navigation.navigate('DebtList')}
              >
                <View style={[styles.debtIconContainer, {
                  backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8',
                  shadowColor: isDark ? '#000' : '#a0a0a0',
                  shadowOffset: { width: 4, height: 4 },
                  shadowOpacity: isDark ? 0.6 : 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                }]}>
                  <Ionicons name="trending-down-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.debtCardContent}>
                  <Text style={[styles.debtCardTitle, { color: colors.text }]}>{t('accounts.owedByMe')}</Text>
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
          title={t('accounts.credits')}
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
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noCredits')}</Text>}
        </AccountSection>

        <View style={{ height: 100 }}></View>
      </ScrollView>

      <FABMenu
        onIncomePress={handleQuickIncome}
        onExpensePress={handleQuickExpense}
        onDebtPress={handleQuickDebt}
        onTransferPress={handleQuickTransfer}
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
      
      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
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
    borderRadius: 16,
    marginBottom: 12,
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
  debtIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 