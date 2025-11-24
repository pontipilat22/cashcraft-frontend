import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBudgetContext } from '../context/BudgetContext'; // РРјРїРѕСЂС‚ С…СѓРєР° BudgetContext
import { useFAB } from '../context/FABContext';
import { AccountSection } from '../components/AccountSection';
import { AccountCard } from '../components/AccountCard';
import { AccountTabs } from '../components/AccountTabs';
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
import BalanceChart from '../components/BalanceChart';
import { SubscriptionScreen } from './SubscriptionScreen';
import { AddGoalModal } from '../components/AddGoalModal';
import { EditGoalModal } from '../components/EditGoalModal';
import { GoalActionsModal } from '../components/GoalActionsModal';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

type AccountsScreenNavigationProp = StackNavigationProp<AccountsStackParamList, 'AccountsMain'>;

interface AccountsScreenProps {
  navigation: AccountsScreenNavigationProp;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { accounts, goals, categories, isLoading, createAccount, updateAccount, deleteAccount, createGoal, updateGoal, deleteGoal, refreshData, createTransaction } = useData();
  const { checkIfPremium } = useSubscription();
  const { user } = useAuth();
  const { t } = useLocalization();
  const { formatAmount, defaultCurrency } = useCurrency();
  const { isEnabled: isBudgetEnabled, reloadData: reloadBudgetData, processIncome } = useBudgetContext();
  const { targetTab, setTargetTab } = useFAB();
  const { trackAccountCreation } = useInterstitialAd();
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

  // Р›РѕРіРёСЂРѕРІР°РЅРёРµ СЃРѕСЃС‚РѕСЏРЅРёСЏ РјРѕРґР°Р»РѕРє
  React.useEffect(() => {
  }, [showEditGoalModal, showGoalActionsModal, selectedGoal]);
  const [activeTab, setActiveTab] = useState<string>('cards');

  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРµ РїРµСЂРµРєР»СЋС‡РµРЅРёРµ РЅР° РЅСѓР¶РЅСѓСЋ РІРєР»Р°РґРєСѓ
  useEffect(() => {
    if (targetTab) {
      setActiveTab(targetTab);
      // РЎР±СЂР°СЃС‹РІР°РµРј targetTab РїРѕСЃР»Рµ РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ
      setTargetTab(null);
    }
  }, [targetTab, setTargetTab]);

  // Р—Р°РіСЂСѓР¶Р°РµРј РґРѕР»РіРё РїСЂРё С„РѕРєСѓСЃРµ СЌРєСЂР°РЅР°
  useFocusEffect(
    React.useCallback(() => {
      loadDebts();
      
      // Р”РѕР±Р°РІР»СЏРµРј СЃР»СѓС€Р°С‚РµР»СЊ РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ РґРѕР»РіРѕРІ
      const unsubscribe = navigation.addListener('focus', () => {
        loadDebts();
      });
      
      return unsubscribe;
    }, [navigation])
  );

  // РЎР»РµРґРёРј Р·Р° РёР·РјРµРЅРµРЅРёСЏРјРё РІ DataContext РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ РґРѕР»РіРѕРІ РїСЂРё СЃР±СЂРѕСЃРµ
  useEffect(() => {
    // РџСЂРѕРІРµСЂСЏРµРј РїСЂРёР·РЅР°РєРё СЃР±СЂРѕСЃР° РґР°РЅРЅС‹С…
    if (accounts.length === 1 && accounts[0].name === 'РќР°Р»РёС‡РЅС‹Рµ' && accounts[0].balance === 0) {
      // РќРµР±РѕР»СЊС€Р°СЏ Р·Р°РґРµСЂР¶РєР° С‡С‚РѕР±С‹ Р‘Р” СѓСЃРїРµР»Р° РѕР±РЅРѕРІРёС‚СЊСЃСЏ
      setTimeout(() => {
        loadDebts();
      }, 100);
    }
  }, [accounts]);

  useFocusEffect(
    React.useCallback(() => {
      checkIfPremium();
      // Р”РѕР±Р°РІР»СЏРµРј РЅРµР±РѕР»СЊС€СѓСЋ Р·Р°РґРµСЂР¶РєСѓ РґР»СЏ РіР°СЂР°РЅС‚РёРё РѕР±РЅРѕРІР»РµРЅРёСЏ СЃРѕСЃС‚РѕСЏРЅРёСЏ
      const timer = setTimeout(() => {
        checkIfPremium();
      }, 500);
      return () => clearTimeout(timer);
    }, [checkIfPremium])
  );

  // РћР±РЅРѕРІР»СЏРµРј РґР°РЅРЅС‹Рµ РїСЂРё С„РѕРєСѓСЃРµ СЌРєСЂР°РЅР° (РґР»СЏ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё РјРµР¶РґСѓ РІРєР»Р°РґРєР°РјРё)
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
      // РћР±РЅРѕРІР»СЏРµРј РґР°РЅРЅС‹Рµ Р±СЋРґР¶РµС‚Р° РґР»СЏ Р°РєС‚СѓР°Р»СЊРЅРѕРіРѕ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ РІ BalanceHeader
      if (isBudgetEnabled) {
        reloadBudgetData();
      }
    }, [refreshData, isBudgetEnabled, reloadBudgetData])
  );

  const loadDebts = async () => {
    const allDebts = await LocalDatabaseService.getDebts();
    setDebts(allDebts);
  };

  // РЎС‡РёС‚Р°РµРј СЃСѓРјРјС‹ РґРѕР»РіРѕРІ
  const debtTotals = useMemo(() => {
    const owed = debts.filter(d => d.type === 'owed_to_me').reduce((sum, d) => sum + d.amount, 0);
    const owe = debts.filter(d => d.type === 'owed_by_me').reduce((sum, d) => sum + d.amount, 0);
    return { owed, owe };
  }, [debts]);

  // Р“СЂСѓРїРїРёСЂСѓРµРј СЃС‡РµС‚Р° РїРѕ С‚РёРїР°Рј (РёСЃРєР»СЋС‡Р°РµРј savings, С‚Р°Рє РєР°Рє С‚РµРїРµСЂСЊ РµСЃС‚СЊ РЅРµР·Р°РІРёСЃРёРјС‹Рµ С†РµР»Рё)
  const groupedAccounts = {
    cards: accounts.filter(a => a.type === 'cash' || a.type === 'card' || a.type === 'bank' || a.type === 'investment'),
    debts: accounts.filter(a => a.type === 'debt'),
    // Р”Р»СЏ РєСЂРµРґРёС‚РѕРІ РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ Р°РєС‚РёРІРЅС‹Рµ (СЃ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј Р±Р°Р»Р°РЅСЃРѕРј, С‚.Рµ. РµСЃС‚СЊ РґРѕР»Рі)
    credits: accounts.filter(a => a.type === 'credit' && a.balance < 0),
  };

  const handleAddAccount = async (section: 'cards' | 'savings' | 'debts' | 'credits') => {

    // РџСЂРѕРґРѕР»Р¶Р°РµРј СЃРѕР·РґР°РЅРёРµ СЃС‡РµС‚Р° (Р±РµР· Р»РёРјРёС‚РѕРІ)
    setSectionToAdd(section);
    
    if (section === 'cards') {
      // Р”Р»СЏ РєР°СЂС‚ Рё СЃС‡РµС‚РѕРІ РїРѕРєР°Р·С‹РІР°РµРј СЃРµР»РµРєС‚РѕСЂ С‚РёРїР°
      setTypeSelectorVisible(true);
    } else if (section === 'debts') {
      // Р”Р»СЏ РґРѕР»РіРѕРІ РѕС‚РєСЂС‹РІР°РµРј СЃРµР»РµРєС‚РѕСЂ С‚РёРїРѕРІ
      setShowDebtTypeSelector(true);
    } else {
      // Р”Р»СЏ РѕСЃС‚Р°Р»СЊРЅС‹С… СЃСЂР°Р·Сѓ РѕС‚РєСЂС‹РІР°РµРј РјРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ
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
    creditDepositAccountId?: string | null;
    [key: string]: any; // Р”Р»СЏ РѕСЃС‚Р°Р»СЊРЅС‹С… РїРѕР»РµР№
  }) => {
    try {

      // Р•СЃР»Рё РЅРѕРІС‹Р№ СЃС‡РµС‚ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ, СЃРЅРёРјР°РµРј С„Р»Р°Рі СЃ РїСЂРµРґС‹РґСѓС‰РµРіРѕ
      if (data.isDefault) {
        const currentDefault = accounts.find(acc => acc.isDefault);
        if (currentDefault) {
          await updateAccount(currentDefault.id, {
            isDefault: false
          });
        }
      }

      // Р•СЃР»Рё СЌС‚Рѕ РєСЂРµРґРёС‚ Рё СѓРєР°Р·Р°РЅ СЃС‡С‘С‚ РґР»СЏ Р·Р°С‡РёСЃР»РµРЅРёСЏ - РїРѕРґРіРѕС‚Р°РІР»РёРІР°РµРј РґР°РЅРЅС‹Рµ Р”Рћ СЃРѕР·РґР°РЅРёСЏ СЃС‡С‘С‚Р°

      let shouldCreateDepositTransaction = false;
      let depositAccountData = null;


      // РџСЂРѕРІРµСЂСЏРµРј, РЅСѓР¶РЅРѕ Р»Рё СЃРѕР·РґР°РІР°С‚СЊ С‚СЂР°РЅР·Р°РєС†РёСЋ Р·Р°С‡РёСЃР»РµРЅРёСЏ
      // РЈСЃР»РѕРІРёСЏ: СЌС‚Рѕ РєСЂРµРґРёС‚, СѓРєР°Р·Р°РЅ СЃС‡РµС‚ РґР»СЏ Р·Р°С‡РёСЃР»РµРЅРёСЏ, Рё СЃСѓРјРјР° > 0
      if (selectedAccountType === 'credit' && data.creditDepositAccountId && typeof data.creditDepositAmount === 'number' && data.creditDepositAmount > 0) {
        const depositAccount = accounts.find(acc => acc.id === data.creditDepositAccountId);
        if (depositAccount) {
          shouldCreateDepositTransaction = true;
          depositAccountData = {
            id: depositAccount.id,
            currentBalance: depositAccount.balance,
            depositAmount: data.creditDepositAmount,
            creditName: data.name,
            creditStartDate: data.creditStartDate
          };
        } else {
        }
      } else {
      }

      // РЎРѕР·РґР°С‘Рј РєСЂРµРґРёС‚РЅС‹Р№ СЃС‡С‘С‚
      const newAccount = await createAccount({
        ...data,
        type: selectedAccountType,
        currency: defaultCurrency
      });

      console.log('🔍 [AccountsScreen] Созданный счет:', newAccount);

      // Отслеживаем создание счета для показа рекламы (каждый 3-й счет)
      await trackAccountCreation();

      // Если включена система бюджетирования и начальный баланс должен учитываться в бюджете
      if (data.includeBudget && data.balance > 0 && selectedAccountType !== 'savings' && selectedAccountType !== 'credit') {
        console.log('💰 [AccountsScreen] Обрабатываем начальный баланс через систему бюджетирования:', {
          balance: data.balance,
          includeBudget: data.includeBudget,
          accountId: newAccount?.id
        });

        if (!newAccount || !newAccount.id) {
          console.error('❌ [AccountsScreen] Ошибка: newAccount не содержит ID!', newAccount);
          setModalVisible(false);
          return;
        }

        // Сначала обрабатываем доход в системе бюджетирования
        await processIncome(data.balance, true);

        // Затем создаем транзакцию начального баланса
        const incomeCategories = categories.filter(cat => cat.type === 'income');
        console.log('📋 [AccountsScreen] Категории дохода:', incomeCategories.map(c => c.name));

        let initialBalanceCategory = incomeCategories.find(
          cat => cat.name.toLowerCase().includes(t('categories.other').toLowerCase())
        );

        if (!initialBalanceCategory && incomeCategories.length > 0) {
          initialBalanceCategory = incomeCategories[0];
        }

        console.log('📋 [AccountsScreen] Выбранная категория:', initialBalanceCategory?.name);

        // Если категория не найдена, создаем её
        if (!initialBalanceCategory) {
          console.warn('⚠️ [AccountsScreen] Категория дохода не найдена, создаем новую...');
          const { LocalDatabaseService } = await import('../services/localDatabase');
          const createdCategory = await LocalDatabaseService.createCategory({
            name: t('categories.otherIncome') || t('categories.other') || 'Другое',
            type: 'income',
            icon: 'cash-outline',
            color: '#4CAF50',
            isDefault: true,
          });
          initialBalanceCategory = createdCategory;
          console.log('✅ [AccountsScreen] Категория создана:', createdCategory);
        }

        if (initialBalanceCategory) {
          await createTransaction({
            amount: data.balance,
            type: 'income',
            accountId: newAccount.id,
            categoryId: initialBalanceCategory.id,
            description: t('accounts.initialBalance') || 'Начальный баланс',
            date: new Date().toISOString(),
          });
          console.log('✅ [AccountsScreen] Транзакция начального баланса создана через систему бюджетирования');
        } else {
          console.error('❌ [AccountsScreen] Не удалось создать или найти категорию для начального баланса!');
        }
      }

      // РџРћРЎР›Р• СЃРѕР·РґР°РЅРёСЏ РєСЂРµРґРёС‚Р° СЃРѕР·РґР°С‘Рј С‚СЂР°РЅР·Р°РєС†РёСЋ Р·Р°С‡РёСЃР»РµРЅРёСЏ
      if (shouldCreateDepositTransaction && depositAccountData) {

        // РЎРѕР·РґР°С‘Рј С‚СЂР°РЅР·Р°РєС†РёСЋ Р·Р°С‡РёСЃР»РµРЅРёСЏ (РѕРЅР° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РѕР±РЅРѕРІРёС‚ Р±Р°Р»Р°РЅСЃ СЃС‡РµС‚Р°)
        await createTransaction({
          accountId: depositAccountData.id,
          amount: depositAccountData.depositAmount,
          type: 'income',
          categoryId: '', // Р‘РµР· РєР°С‚РµРіРѕСЂРёРё РґР»СЏ РєСЂРµРґРёС‚РЅС‹С… С‚СЂР°РЅР·Р°РєС†РёР№
          description: `РџРѕР»СѓС‡РµРЅРёРµ РєСЂРµРґРёС‚Р° "${depositAccountData.creditName}"`,
          date: depositAccountData.creditStartDate || new Date().toISOString(),
        });
      } else {
      }

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
      // Р•СЃР»Рё СЃС‡РµС‚ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ, СЃРЅРёРјР°РµРј С„Р»Р°Рі СЃ РїСЂРµРґС‹РґСѓС‰РµРіРѕ
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
      return `${String(account.name || '')} вЂўвЂўвЂўвЂў ${String(account.cardNumber || '')}`;
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
    // РџСЂРѕРІРµСЂСЏРµРј РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ РїРµСЂРµРІРѕРґР°: РЅСѓР¶РµРЅ РјРёРЅРёРјСѓРј 1 СЃС‡РµС‚ Рё Р»РёР±Рѕ РµС‰Рµ РѕРґРёРЅ СЃС‡РµС‚, Р»РёР±Рѕ С†РµР»Рё
    const canTransfer = accounts.length >= 1 && (accounts.length >= 2 || goals.length > 0);

    if (!canTransfer) {
      Alert.alert(
        t('transactions.transfer'),
        t('accounts.needAccountsOrGoalsForTransfer') || 'Р”Р»СЏ РїРµСЂРµРІРѕРґР° РЅРµРѕР±С…РѕРґРёРјРѕ РёРјРµС‚СЊ РјРёРЅРёРјСѓРј РѕРґРёРЅ СЃС‡РµС‚ Рё РµС‰Рµ РѕРґРёРЅ СЃС‡РµС‚ РёР»Рё С†РµР»СЊ РґР»СЏ РїРµСЂРµРІРѕРґР°',
        [
          {
            text: t('common.close') || 'Р—Р°РєСЂС‹С‚СЊ',
            style: 'cancel'
          },
          {
            text: t('accounts.openAccount') || 'РћС‚РєСЂС‹С‚СЊ СЃС‡РµС‚',
            onPress: () => {
              // РћС‚РєСЂС‹РІР°РµРј СЃРµР»РµРєС‚РѕСЂ С‚РёРїР° СЃС‡РµС‚Р° РґР»СЏ СЃРѕР·РґР°РЅРёСЏ РЅРѕРІРѕРіРѕ
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
    // РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё СЃС‡РµС‚Р° РґР»СЏ РїРµСЂРµРІРѕРґР° РІ С†РµР»СЊ
    if (accounts.length < 1) {
      Alert.alert(
        t('transactions.transfer'),
        t('accounts.needAccountForGoalTransfer') || 'Р”Р»СЏ РїРµСЂРµРІРѕРґР° РІ С†РµР»СЊ РЅРµРѕР±С…РѕРґРёРјРѕ РёРјРµС‚СЊ РјРёРЅРёРјСѓРј РѕРґРёРЅ СЃС‡РµС‚',
        [
          {
            text: t('common.close') || 'Р—Р°РєСЂС‹С‚СЊ',
            style: 'cancel'
          },
          {
            text: t('accounts.openAccount') || 'РћС‚РєСЂС‹С‚СЊ СЃС‡РµС‚',
            onPress: () => {
              setTypeSelectorVisible(true);
            }
          }
        ]
      );
      return;
    }
    // РћС‚РєСЂС‹РІР°РµРј РјРѕРґР°Р»РєСѓ РїРµСЂРµРІРѕРґРѕРІ
    setShowTransferModal(true);
  };

  const handleAccountPress = (account: Account) => {
    // Р•СЃР»Рё СЌС‚Рѕ РєСЂРµРґРёС‚, РѕС‚РєСЂС‹РІР°РµРј СЌРєСЂР°РЅ РґРµС‚Р°Р»РµР№ РєСЂРµРґРёС‚Р°
    if (account.type === 'credit') {
      navigation.navigate('CreditDetails', { accountId: account.id });
    }
    // Р”Р»СЏ РґСЂСѓРіРёС… С‚РёРїРѕРІ СЃС‡РµС‚РѕРІ РїРѕРєР° РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°РµРј
    // Р’ Р±СѓРґСѓС‰РµРј РјРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ СЌРєСЂР°РЅС‹ РґРµС‚Р°Р»РµР№ РґР»СЏ РґСЂСѓРіРёС… С‚РёРїРѕРІ
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
    // Р’СЃРµРіРґР° РїСЂРѕРІРµСЂСЏРµРј Р°РєС‚СѓР°Р»СЊРЅС‹Р№ СЃС‚Р°С‚СѓСЃ РїРѕРґРїРёСЃРєРё
    const hasPremium = await checkIfPremium();


    // РџСЂРѕСЃС‚Р°СЏ Р»РѕРіРёРєР°: Р±РµР· РїРѕРґРїРёСЃРєРё - РјР°РєСЃРёРјСѓРј 2 С†РµР»Рё Р’РЎР•Р“Рћ
    const MAX_FREE_GOALS = 2;

    if (!hasPremium && goals.length >= MAX_FREE_GOALS) {

      if (user?.isGuest) {
        Alert.alert(
          'РўСЂРµР±СѓРµС‚СЃСЏ Р°РІС‚РѕСЂРёР·Р°С†РёСЏ',
          `Р“РѕСЃС‚РµРІС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РјРѕРіСѓС‚ СЃРѕР·РґР°С‚СЊ С‚РѕР»СЊРєРѕ ${MAX_FREE_GOALS} С†РµР»Рё. Р’РѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚ Рё РѕС„РѕСЂРјРёС‚Рµ РїРѕРґРїРёСЃРєСѓ РґР»СЏ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРЅРѕРіРѕ РєРѕР»РёС‡РµСЃС‚РІР° С†РµР»РµР№.`,
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: 'Р’РѕР№С‚Рё РІ Р°РєРєР°СѓРЅС‚',
              onPress: () => {
                navigation.navigate('More' as any);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'РўСЂРµР±СѓРµС‚СЃСЏ РїРѕРґРїРёСЃРєР° Premium',
          `Р‘РµСЃРїР»Р°С‚РЅР°СЏ РІРµСЂСЃРёСЏ РїРѕР·РІРѕР»СЏРµС‚ СЃРѕР·РґР°С‚СЊ С‚РѕР»СЊРєРѕ ${MAX_FREE_GOALS} С†РµР»Рё. РћС„РѕСЂРјРёС‚Рµ РїРѕРґРїРёСЃРєСѓ РґР»СЏ РЅРµРѕРіСЂР°РЅРёС‡РµРЅРЅРѕРіРѕ РєРѕР»РёС‡РµСЃС‚РІР° С†РµР»РµР№.`,
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: 'РћС„РѕСЂРјРёС‚СЊ РїРѕРґРїРёСЃРєСѓ',
              onPress: () => {
                setShowSubscriptionModal(true);
              },
            },
          ]
        );
      }
      return;
    }

    // Р•СЃР»Рё РїСЂРѕРІРµСЂРєР° РїСЂРѕР№РґРµРЅР°, РїРѕРєР°Р·С‹РІР°РµРј РјРѕРґР°Р» СЃРѕР·РґР°РЅРёСЏ С†РµР»Рё
    setShowGoalModal(true);
  };

  const handleGoalLongPress = (goal: any) => {
    setSelectedGoal(goal);
    setShowGoalActionsModal(true);
  };

  const handleEditGoal = () => {
    setShowGoalActionsModal(false);
    // РќРµ СЃР±СЂР°СЃС‹РІР°РµРј selectedGoal Р·РґРµСЃСЊ, С‚Р°Рє РєР°Рє РѕРЅ РЅСѓР¶РµРЅ РґР»СЏ EditGoalModal
    setShowEditGoalModal(true);
  };

  const handleGoalActionsClose = () => {
    setShowGoalActionsModal(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    Alert.alert(
      'РЈРґР°Р»РёС‚СЊ С†РµР»СЊ',
      `РЈРґР°Р»РёС‚СЊ С†РµР»СЊ "${selectedGoal.name}"? Р’СЃРµ СЃРІСЏР·Р°РЅРЅС‹Рµ РїРµСЂРµРІРѕРґС‹ С‚Р°РєР¶Рµ Р±СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹.`,
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
    try {
      await updateGoal(goalId, data);
      setShowEditGoalModal(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error('вќЊ [AccountsScreen] Error updating goal:', error);
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
        backgroundColor={colors.card}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {/* График баланса */}
        <BalanceChart />

        <View style={{ marginTop: 16 }}>
          <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </View>

        {activeTab === 'cards' && (
          <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          {Array.isArray(groupedAccounts.cards) && groupedAccounts.cards.length > 0
            ? groupedAccounts.cards.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => handleAccountPress(account)}
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
                // РџСЂРµРѕР±СЂР°Р·СѓРµРј Goal РІ Account-РїРѕРґРѕР±РЅС‹Р№ РѕР±СЉРµРєС‚ РґР»СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё СЃ AccountCard
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
                  onPress={() => handleAccountPress(account)}
                  onLongPress={() => handleAccountLongPress(account)}
                />
              ))
            : <Text style={{color: colors.textSecondary, textAlign: 'center', marginVertical: 12}}>{t('accounts.noCredits')}</Text>}
          </View>
        )}

        <View style={{ height: 100 }}></View>
      </ScrollView>

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
