import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { AccountSection } from '../components/AccountSection';
import { AccountCard } from '../components/AccountCard';
import { AccountTabs } from '../components/AccountTabs';
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
import { SavingsActionModal } from '../components/SavingsActionModal';
import { StatisticsCard } from '../components/StatisticsCard';
import { SubscriptionScreen } from './SubscriptionScreen';

type AccountsScreenNavigationProp = StackNavigationProp<AccountsStackParamList, 'AccountsMain'>;

interface AccountsScreenProps {
  navigation: AccountsScreenNavigationProp;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, addToSavings, withdrawFromSavings, refreshData } = useData();
  const { checkIfPremium } = useSubscription();
  const { user } = useAuth();
  const { t } = useLocalization();
  const { formatAmount, defaultCurrency } = useCurrency();
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
  const [showSavingsActionModal, setShowSavingsActionModal] = useState(false);
  const [savingsAction, setSavingsAction] = useState<'add' | 'withdraw'>('add');
  const [selectedSavings, setSelectedSavings] = useState<Account | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('cards');

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

  useFocusEffect(
    React.useCallback(() => {
      checkIfPremium();
      // Добавляем небольшую задержку для гарантии обновления состояния
      const timer = setTimeout(() => {
        checkIfPremium();
      }, 500);
      return () => clearTimeout(timer);
    }, [checkIfPremium])
  );

  // Обновляем данные при фокусе экрана (для синхронизации между вкладками)
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [refreshData])
  );

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

  const handleAddAccount = async (section: 'cards' | 'savings' | 'debts' | 'credits') => {
    console.log('🎯 [AccountsScreen] handleAddAccount called for section:', section);
    
    // Всегда проверяем актуальный статус подписки
    const hasPremium = await checkIfPremium();
    
    console.log('📊 [AccountsScreen] Current state:');
    console.log('  - hasPremium:', hasPremium);
    console.log('  - total accounts:', accounts.length);
    console.log('  - user:', user);
    console.log('  - isGuest:', user?.isGuest);
    
    // Простая логика: без подписки - максимум 2 счета ВСЕГО
    const MAX_FREE_ACCOUNTS = 2;
    
    if (!hasPremium && accounts.length >= MAX_FREE_ACCOUNTS) {
      console.log('⚠️ [AccountsScreen] Account limit reached!');
      console.log('  - Current accounts:', accounts.length);
      console.log('  - Limit:', MAX_FREE_ACCOUNTS);
      
      if (user?.isGuest) {
        Alert.alert(
          'Требуется авторизация',
          `Гостевые пользователи могут создать только ${MAX_FREE_ACCOUNTS} счета. Войдите в аккаунт и оформите подписку для неограниченного количества счетов.`,
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: 'Войти в аккаунт',
              onPress: () => {
                navigation.navigate('More' as any);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Требуется подписка Premium',
          `Бесплатная версия позволяет создать только ${MAX_FREE_ACCOUNTS} счета. Оформите подписку для неограниченного количества счетов.`,
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: 'Оформить подписку',
              onPress: () => {
                setShowSubscriptionModal(true);
              },
            },
          ]
        );
      }
      return;
    }

    // Если проверка пройдена, продолжаем создание счета
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

  const handleSavingsAction = (savings: Account, action: 'add' | 'withdraw') => {
    setSelectedSavings(savings);
    setSavingsAction(action);
    setShowSavingsActionModal(true);
  };

  const handleSavingsActionConfirm = async (amount: number) => {
    if (!selectedSavings) return;
    
    try {
      if (savingsAction === 'add') {
        await addToSavings(selectedSavings.id, amount);
      } else {
        await withdrawFromSavings(selectedSavings.id, amount);
      }
      setShowSavingsActionModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.error'));
    }
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
        <StatisticsCard />

        <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'cards' && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
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
          </View>
        )}

        {activeTab === 'goals' && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          {Array.isArray(groupedAccounts.savings) && groupedAccounts.savings.length > 0
            ? groupedAccounts.savings.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => {}}
                  onLongPress={() => handleAccountLongPress(account)}
                  onAddToSavings={() => handleSavingsAction(account, 'add')}
                  onWithdrawFromSavings={() => handleSavingsAction(account, 'withdraw')}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noSavings')}</Text>}
          </View>
        )}

        {activeTab === 'debts' && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          {debts.length === 0 ? (
            <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noDebts')}</Text>
          ) : (
            <>
              <AccountCard
                account={{
                  id: 'debt-owed-to-me',
                  name: t('accounts.owedToMe'),
                  type: 'debt' as any,
                  balance: debtTotals.owed,
                  currency: defaultCurrency,
                  icon: 'trending-up-outline' as any,
                  isDefault: false,
                }}
                onPress={() => navigation.navigate('DebtList', { type: 'owed_to_me' })}
                onLongPress={() => {}}
              />
              <AccountCard
                account={{
                  id: 'debt-owed-by-me',
                  name: t('accounts.owedByMe'),
                  type: 'debt' as any,
                  balance: debtTotals.owe,
                  currency: defaultCurrency,
                  icon: 'trending-down-outline' as any,
                  isDefault: false,
                }}
                onPress={() => navigation.navigate('DebtList', { type: 'owed_by_me' })}
                onLongPress={() => {}}
              />
            </>
          )}
          </View>
        )}

        {activeTab === 'credits' && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
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
          </View>
        )}

        <View style={{ height: 100 }}></View>
      </ScrollView>

      <FABMenu
        onIncomePress={handleQuickIncome}
        onExpensePress={handleQuickExpense}
        onDebtPress={handleQuickDebt}
        onTransferPress={handleQuickTransfer}
        onAddAccountPress={() => handleAddAccount('cards')}
        onAddSavingsPress={() => handleAddAccount('savings')}
        onAddCreditPress={() => handleAddAccount('credits')}
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

      {selectedSavings && selectedSavings.linkedAccountId && (
        <SavingsActionModal
          visible={showSavingsActionModal}
          onClose={() => setShowSavingsActionModal(false)}
          onConfirm={handleSavingsActionConfirm}
          action={savingsAction}
          savings={selectedSavings}
          linkedAccount={accounts.find(acc => acc.id === selectedSavings.linkedAccountId)}
        />
      )}

      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
          checkIfPremium();
        }}
      >
        <SubscriptionScreen onClose={() => {
          setShowSubscriptionModal(false);
          checkIfPremium();
        }} />
      </Modal>
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

}); 