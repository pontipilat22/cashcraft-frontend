import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetContext } from '../context/BudgetContext';
import { AccountSection } from '../components/AccountSection';
import { AccountCard } from '../components/AccountCard';
import { AccountTabs } from '../components/AccountTabs';
import { NewFABMenu } from '../components/NewFABMenu';
import { AddAccountModal } from '../components/AddAccountModal';
import { EditAccountModal } from '../components/EditAccountModal';
import { AccountTypeSelector } from '../components/AccountTypeSelector';
import { AccountActionsModal } from '../components/AccountActionsModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AccountType, Account, Debt, Goal } from '../types/index';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { DebtOperationModal } from '../components/DebtOperationModal';
import { DebtTypeSelector } from '../components/DebtTypeSelector';
import { StackNavigationProp } from '@react-navigation/stack';
import { AccountsStackParamList } from '../navigation/AccountsNavigator';
import { LocalDatabaseService } from '../services/localDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { TransferModal } from '../components/TransferModal';
import { StatisticsCard } from '../components/StatisticsCard';
import { SubscriptionScreen } from './SubscriptionScreen';
import { AddGoalModal } from '../components/AddGoalModal';
import { EditGoalModal } from '../components/EditGoalModal';
import { GoalActionsModal } from '../components/GoalActionsModal';

type AccountsScreenNavigationProp = StackNavigationProp<AccountsStackParamList, 'AccountsMain'>;

interface AccountsScreenProps {
  navigation: AccountsScreenNavigationProp;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { accounts, goals, isLoading, createAccount, updateAccount, deleteAccount, createGoal, updateGoal, deleteGoal, refreshData } = useData();
  const { checkIfPremium } = useSubscription();
  const { user } = useAuth();
  const { t } = useLocalization();
  const { formatAmount, defaultCurrency } = useCurrency();
  const { isEnabled: isBudgetEnabled, reloadData: reloadBudgetData } = useBudgetContext();
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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [showGoalActionsModal, setShowGoalActionsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  // Логирование состояния модалок
  React.useEffect(() => {
    console.log('🔍 [AccountsScreen] Modal states:', {
      showEditGoalModal,
      showGoalActionsModal,
      selectedGoalId: selectedGoal?.id
    });
  }, [showEditGoalModal, showGoalActionsModal, selectedGoal]);
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
      // Обновляем данные бюджета для актуального отображения в BalanceHeader
      if (isBudgetEnabled) {
        reloadBudgetData();
      }
    }, [refreshData, isBudgetEnabled, reloadBudgetData])
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

  // Группируем счета по типам (исключаем savings, так как теперь есть независимые цели)
  const groupedAccounts = {
    cards: accounts.filter(a => a.type === 'cash' || a.type === 'card' || a.type === 'bank' || a.type === 'investment'),
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
        type: selectedAccountType,
        currency: defaultCurrency
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
    // Проверяем возможность перевода: нужен минимум 1 счет и либо еще один счет, либо цели
    const canTransfer = accounts.length >= 1 && (accounts.length >= 2 || goals.length > 0);

    if (!canTransfer) {
      Alert.alert(
        t('transactions.transfer'),
        t('accounts.needAccountsOrGoalsForTransfer') || 'Для перевода необходимо иметь минимум один счет и еще один счет или цель для перевода',
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

  const handleGoalPress = (goal: Goal) => {
    // Проверяем, есть ли счета для перевода в цель
    if (accounts.length < 1) {
      Alert.alert(
        t('transactions.transfer'),
        t('accounts.needAccountForGoalTransfer') || 'Для перевода в цель необходимо иметь минимум один счет',
        [
          {
            text: t('common.close') || 'Закрыть',
            style: 'cancel'
          },
          {
            text: t('accounts.openAccount') || 'Открыть счет',
            onPress: () => {
              setTypeSelectorVisible(true);
            }
          }
        ]
      );
      return;
    }
    // Открываем модалку переводов
    setShowTransferModal(true);
  };



  const handleDebtTypeSelect = (type: 'give' | 'return' | 'borrow' | 'payback') => {
    setDebtOperationType(type);
    setShowDebtOperationModal(true);
  };

  const handleCreateGoal = async (data: {
    name: string;
    targetAmount: number;
    currency: string;
    color?: string;
    icon?: string;
    description?: string;
  }) => {
    try {
      await createGoal(data);
      setShowGoalModal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleAddGoal = async () => {
    // Всегда проверяем актуальный статус подписки
    const hasPremium = await checkIfPremium();

    console.log('🎯 [AccountsScreen] handleAddGoal called');
    console.log('📊 [AccountsScreen] Current goals state:');
    console.log('  - hasPremium:', hasPremium);
    console.log('  - total goals:', goals.length);
    console.log('  - user:', user);
    console.log('  - isGuest:', user?.isGuest);

    // Простая логика: без подписки - максимум 2 цели ВСЕГО
    const MAX_FREE_GOALS = 2;

    if (!hasPremium && goals.length >= MAX_FREE_GOALS) {
      console.log('⚠️ [AccountsScreen] Goal limit reached!');
      console.log('  - Current goals:', goals.length);
      console.log('  - Limit:', MAX_FREE_GOALS);

      if (user?.isGuest) {
        Alert.alert(
          'Требуется авторизация',
          `Гостевые пользователи могут создать только ${MAX_FREE_GOALS} цели. Войдите в аккаунт и оформите подписку для неограниченного количества целей.`,
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
          `Бесплатная версия позволяет создать только ${MAX_FREE_GOALS} цели. Оформите подписку для неограниченного количества целей.`,
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

    // Если проверка пройдена, показываем модал создания цели
    setShowGoalModal(true);
  };

  const handleGoalLongPress = (goal: any) => {
    console.log('🔄 [AccountsScreen] handleGoalLongPress called:', goal.id);
    setSelectedGoal(goal);
    setShowGoalActionsModal(true);
    console.log('📂 [AccountsScreen] GoalActionsModal opened');
  };

  const handleEditGoal = () => {
    console.log('✏️ [AccountsScreen] handleEditGoal called');
    setShowGoalActionsModal(false);
    console.log('📂 [AccountsScreen] GoalActionsModal closed');
    // Не сбрасываем selectedGoal здесь, так как он нужен для EditGoalModal
    setShowEditGoalModal(true);
    console.log('✨ [AccountsScreen] EditGoalModal opened');
  };

  const handleGoalActionsClose = () => {
    setShowGoalActionsModal(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    Alert.alert(
      'Удалить цель',
      `Удалить цель "${selectedGoal.name}"? Все связанные переводы также будут удалены.`,
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
              await deleteGoal(selectedGoal.id);
              setShowGoalActionsModal(false);
              setSelectedGoal(null);
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert(t('common.error'), t('common.somethingWentWrong'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateGoal = async (goalId: string, data: {
    name: string;
    targetAmount: number;
    currency: string;
    icon?: string;
    description?: string;
  }) => {
    console.log('🎯 [AccountsScreen] handleUpdateGoal called:', { goalId, data });
    try {
      await updateGoal(goalId, data);
      console.log('✅ [AccountsScreen] Goal updated successfully');
      setShowEditGoalModal(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error('❌ [AccountsScreen] Error updating goal:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 0 }}>
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
          {goals.length > 0
            ? goals.map(goal => {
                // Преобразуем Goal в Account-подобный объект для совместимости с AccountCard
                const goalAsAccount = {
                  id: goal.id,
                  name: goal.name,
                  type: 'savings' as const,
                  balance: goal.currentAmount,
                  currency: goal.currency,
                  color: goal.color,
                  icon: goal.icon,
                  isDefault: false,
                  isIncludedInTotal: false,
                  targetAmount: goal.targetAmount,
                  savedAmount: goal.currentAmount,
                  isTargetedSavings: true,
                  createdAt: goal.createdAt,
                  updatedAt: goal.updatedAt,
                  syncedAt: goal.syncedAt,
                };
                
                return (
                  <AccountCard
                    key={goal.id}
                    account={goalAsAccount}
                    onPress={() => handleGoalPress(goal)}
                    onLongPress={() => handleGoalLongPress(goal)}
                  />
                );
              })
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noGoals')}</Text>}
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
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
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
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
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

      <NewFABMenu
        onIncomePress={handleQuickIncome}
        onExpensePress={handleQuickExpense}
        onTransferPress={handleQuickTransfer}
        onDebtPress={handleQuickDebt}
        onAddAccountPress={() => handleAddAccount('cards')}
        onAddSavingsPress={handleAddGoal}
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
        isBudgetEnabled={isBudgetEnabled}
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

      <AddGoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSave={handleCreateGoal}
      />

      <EditGoalModal
        visible={showEditGoalModal}
        goal={selectedGoal}
        onClose={() => {
          setShowEditGoalModal(false);
          setSelectedGoal(null);
        }}
        onSave={handleUpdateGoal}
      />

      <GoalActionsModal
        visible={showGoalActionsModal}
        goalName={selectedGoal?.name || ''}
        onClose={handleGoalActionsClose}
        onEdit={handleEditGoal}
        onDelete={handleDeleteGoal}
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
}); 