import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabNavigator } from './BottomTabNavigator';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { TransferModal } from '../components/TransferModal';
import { DebtOperationModal } from '../components/DebtOperationModal';
import { DebtTypeSelector } from '../components/DebtTypeSelector';
import { AddAccountModal } from '../components/AddAccountModal';
import { AccountTypeSelector } from '../components/AccountTypeSelector';
import { AddGoalModal } from '../components/AddGoalModal';
import { useFAB } from '../context/FABContext';
import { useData } from '../context/DataContext';
import { useBudgetContext } from '../context/BudgetContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTheme } from '../context/ThemeContext';
import { AccountType } from '../types';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

export const BottomTabNavigatorWrapper: React.FC = () => {
  const { isFABMenuOpen, closeFABMenu, setTargetTab } = useFAB();
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { createAccount, createGoal, accounts, categories, updateAccount, createTransaction } = useData();
  const { reloadData: reloadBudgetData, isEnabled: isBudgetEnabled, processIncome } = useBudgetContext();
  const { trackAccountCreation } = useInterstitialAd();

  // Modals state
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showDebtTypeSelector, setShowDebtTypeSelector] = useState(false);
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>('card');
  const [selectedDebtType, setSelectedDebtType] = useState<'give' | 'return' | 'borrow' | 'payback' | null>(null);

  // Handlers
  const handleQuickIncome = () => {
    closeFABMenu();
    setTransactionType('income');
    setShowAddModal(true);
  };

  const handleQuickExpense = () => {
    closeFABMenu();
    setTransactionType('expense');
    setShowAddModal(true);
  };

  const handleQuickTransfer = () => {
    closeFABMenu();
    setShowTransferModal(true);
  };

  const handleQuickDebt = () => {
    closeFABMenu();
    setShowDebtTypeSelector(true);
  };

  const handleAddAccount = (type: AccountType) => {
    closeFABMenu();
    setSelectedAccountType(type);
    setShowAccountTypeSelector(false);
    setShowAddAccountModal(true);
  };

  const handleAddGoal = () => {
    closeFABMenu();
    setShowAddGoalModal(true);
  };

  const handleAddCredit = () => {
    closeFABMenu();
    setSelectedAccountType('credit');
    setShowAddAccountModal(true);
  };

  const handleSelectDebtType = (type: 'give' | 'return' | 'borrow' | 'payback') => {
    setSelectedDebtType(type);
    setShowDebtTypeSelector(false);
    setShowDebtModal(true);
  };

  const handleSelectAccountType = (type: AccountType) => {
    handleAddAccount(type);
  };

  const handleSaveAccount = async (accountData: any) => {
    try {
      console.log('🚀 [BottomTabNavigatorWrapper] handleSaveAccount ВЫЗВАН');
      console.log('📦 [BottomTabNavigatorWrapper] Полученные данные:', JSON.stringify(accountData, null, 2));
      console.log('🏷️ [BottomTabNavigatorWrapper] Тип счета (selectedAccountType):', selectedAccountType);

      // Добавляем type к данным счета
      const accountWithType = {
        ...accountData,
        type: selectedAccountType,
      };

      // Если это кредит и указан счёт для зачисления - подготавливаем данные ДО создания счёта
      console.log('=== 🏦 НАЧАЛО СОЗДАНИЯ КРЕДИТА ===');
      console.log('💰 Данные кредита:', {
        типСчета: selectedAccountType,
        счетДляЗачисления: accountData.creditDepositAccountId,
        суммаЗачисления: accountData.creditDepositAmount,
        суммаКредита: accountData.creditInitialAmount
      });

      let shouldCreateDepositTransaction = false;
      let depositAccountData = null;

      console.log('🔍 Проверяем условия для транзакции зачисления:');
      console.log('  ✓ Это кредит?', selectedAccountType === 'credit');
      console.log('  ✓ ID счета для зачисления:', accountData.creditDepositAccountId);
      console.log('  ✓ Сумма зачисления:', accountData.creditDepositAmount);
      console.log('  ✓ Сумма определена?', accountData.creditDepositAmount !== undefined);

      // Проверяем, нужно ли создавать транзакцию зачисления
      // Условия: это кредит, указан счет для зачисления, и сумма > 0
      if (selectedAccountType === 'credit' && accountData.creditDepositAccountId && typeof accountData.creditDepositAmount === 'number' && accountData.creditDepositAmount > 0) {
        const depositAccount = accounts.find(acc => acc.id === accountData.creditDepositAccountId);
        console.log('✅ Счет для зачисления найден:', depositAccount?.name, '| Сумма для зачисления:', accountData.creditDepositAmount);
        if (depositAccount) {
          shouldCreateDepositTransaction = true;
          depositAccountData = {
            id: depositAccount.id,
            currentBalance: depositAccount.balance,
            depositAmount: accountData.creditDepositAmount,
            creditName: accountData.name,
            creditStartDate: accountData.creditStartDate
          };
          console.log('✅ БУДЕТ СОЗДАНА транзакция зачисления после создания кредитного счета');
        } else {
          console.log('❌ Зачисление пропущено: счет не найден в списке счетов');
        }
      } else {
        console.log('❌ Транзакция зачисления НЕ БУДЕТ СОЗДАНА. Причины:');
        console.log('   - Это кредит?', selectedAccountType === 'credit');
        console.log('   - Есть ID счета для зачисления?', !!accountData.creditDepositAccountId, '(значение:', accountData.creditDepositAccountId, ')');
        console.log('   - Сумма является числом?', typeof accountData.creditDepositAmount === 'number', '(тип:', typeof accountData.creditDepositAmount, ')');
        console.log('   - Сумма больше 0?', accountData.creditDepositAmount > 0, '(значение:', accountData.creditDepositAmount, ')');
      }

      // Создаём кредитный счёт
      const newAccount = await createAccount(accountWithType);

      console.log('🔍 [BottomTabNavigatorWrapper] Созданный счет:', newAccount);

      // Отслеживаем создание счета для показа рекламы (каждый 3-й счет)
      await trackAccountCreation();

      // Если включена система бюджетирования и начальный баланс должен учитываться в бюджете
      if (accountData.includeBudget && accountData.balance > 0 && selectedAccountType !== 'savings' && selectedAccountType !== 'credit') {
        console.log('💰 [BottomTabNavigatorWrapper] Обрабатываем начальный баланс через систему бюджетирования:', {
          balance: accountData.balance,
          includeBudget: accountData.includeBudget,
          accountId: newAccount?.id
        });

        if (!newAccount || !newAccount.id) {
          console.error('❌ [BottomTabNavigatorWrapper] Ошибка: newAccount не содержит ID!', newAccount);
          setShowAddAccountModal(false);
          return;
        }

        // Сначала обрабатываем доход в системе бюджетирования
        await processIncome(accountData.balance, true);

        // Затем создаем транзакцию начального баланса
        console.log('📋 [BottomTabNavigatorWrapper] Все категории:', categories.map(c => ({ name: c.name, type: c.type })));
        const incomeCategories = categories.filter(cat => cat.type === 'income');
        console.log('📋 [BottomTabNavigatorWrapper] Категории дохода:', incomeCategories.map(c => c.name));

        let initialBalanceCategory = incomeCategories.find(
          cat => cat.name.toLowerCase().includes(t('categories.other').toLowerCase())
        );

        if (!initialBalanceCategory && incomeCategories.length > 0) {
          initialBalanceCategory = incomeCategories[0];
        }

        console.log('📋 [BottomTabNavigatorWrapper] Выбранная категория:', initialBalanceCategory?.name);

        // Если категория не найдена, создаем её
        if (!initialBalanceCategory) {
          console.warn('⚠️ [BottomTabNavigatorWrapper] Категория дохода не найдена, создаем новую...');

          // Создаем простую категорию "Другое" для дохода
          const { LocalDatabaseService } = await import('../services/localDatabase');
          const createdCategory = await LocalDatabaseService.createCategory({
            name: t('categories.otherIncome') || t('categories.other') || 'Другое',
            type: 'income',
            icon: 'cash-outline',
            color: '#4CAF50',
            isDefault: true,
          });

          initialBalanceCategory = createdCategory;
          console.log('✅ [BottomTabNavigatorWrapper] Категория создана:', createdCategory);
        }

        if (initialBalanceCategory) {
          await createTransaction({
            amount: accountData.balance,
            type: 'income',
            accountId: newAccount.id,
            categoryId: initialBalanceCategory.id,
            description: t('accounts.initialBalance') || 'Начальный баланс',
            date: new Date().toISOString(),
          });
          console.log('✅ [BottomTabNavigatorWrapper] Транзакция начального баланса создана через систему бюджетирования');
        } else {
          console.error('❌ [BottomTabNavigatorWrapper] Не удалось создать или найти категорию для начального баланса!');
        }
      }

      // ПОСЛЕ создания кредита создаём транзакцию зачисления
      if (shouldCreateDepositTransaction && depositAccountData) {
        console.log('💳 Создаю транзакцию зачисления кредита...');

        // Создаём транзакцию зачисления (она автоматически обновит баланс счета)
        await createTransaction({
          accountId: depositAccountData.id,
          amount: depositAccountData.depositAmount,
          type: 'income',
          categoryId: '', // Без категории для кредитных транзакций
          description: `Получение кредита "${depositAccountData.creditName}"`,
          date: depositAccountData.creditStartDate || new Date().toISOString(),
        });
        console.log('💵 Баланс счета автоматически обновлен транзакцией:', depositAccountData.currentBalance, '+', depositAccountData.depositAmount, '=', depositAccountData.currentBalance + depositAccountData.depositAmount);
        console.log('✅ ТРАНЗАКЦИЯ ЗАЧИСЛЕНИЯ СОЗДАНА УСПЕШНО!');
        console.log('=== 🎉 КРЕДИТ СОЗДАН И ЗАЧИСЛЕН ===');
      } else {
        console.log('⚠️ Транзакция зачисления НЕ создана (shouldCreate:', shouldCreateDepositTransaction, ', hasData:', !!depositAccountData, ')');
      }

      await reloadBudgetData();
      setShowAddAccountModal(false);

      // Если создали кредит, переключаем на вкладку кредитов
      if (selectedAccountType === 'credit') {
        setTargetTab('credits');
      }
    } catch (error) {
      console.error('❌ [BottomTabNavigatorWrapper] Error creating account:', error);
    }
  };

  const handleSaveGoal = async (goalData: any) => {
    await createGoal(goalData);
    await reloadBudgetData();
    setShowAddGoalModal(false);
  };

  const menuItems = [
    {
      id: 'income',
      title: t('transactions.income'),
      icon: 'add-circle' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleQuickIncome,
    },
    {
      id: 'expense',
      title: t('transactions.expense'),
      icon: 'remove-circle' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleQuickExpense,
    },
    {
      id: 'transfer',
      title: t('transactions.transfer'),
      icon: 'swap-horizontal' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleQuickTransfer,
    },
    {
      id: 'debt',
      title: t('debts.debt'),
      icon: 'people' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleQuickDebt,
    },
    {
      id: 'account',
      title: t('accounts.addAccount'),
      icon: 'wallet' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: () => {
        closeFABMenu();
        setShowAccountTypeSelector(true);
      },
    },
    {
      id: 'savings',
      title: t('goals.goal'),
      icon: 'flag' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleAddGoal,
    },
    {
      id: 'credit',
      title: t('accounts.addCredit') || 'Добавить кредит',
      icon: 'card' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: handleAddCredit,
    },
  ];

  return (
    <View style={styles.container}>
      <BottomTabNavigator />

      {isFABMenuOpen && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={closeFABMenu}
        >
          <View style={fabStyles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeFABMenu} />

            <View style={[fabStyles.menuContainer, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[fabStyles.closeButton, { backgroundColor: colors.border }]}
                onPress={closeFABMenu}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[fabStyles.menuTitle, { color: colors.text }]}>
                {t('common.quickActions')}
              </Text>

              <View style={fabStyles.menuList}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      fabStyles.menuItem,
                      { borderBottomColor: colors.border },
                      index === menuItems.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={[fabStyles.menuItemIcon, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={[fabStyles.menuItemText, { color: colors.text }]}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showAddModal && (
        <AddTransactionModal
          visible={showAddModal}
          initialType={transactionType}
          isBudgetEnabled={isBudgetEnabled}
          onClose={async () => {
            setShowAddModal(false);
            await reloadBudgetData();
          }}
        />
      )}

      {showTransferModal && (
        <TransferModal
          visible={showTransferModal}
          onClose={async () => {
            setShowTransferModal(false);
            await reloadBudgetData();
          }}
        />
      )}

      {showDebtModal && (
        <DebtOperationModal
          visible={showDebtModal}
          operationType={selectedDebtType}
          onClose={() => setShowDebtModal(false)}
          onOperationComplete={async () => {
            await reloadBudgetData();
          }}
        />
      )}

      {showDebtTypeSelector && (
        <DebtTypeSelector
          visible={showDebtTypeSelector}
          onSelect={handleSelectDebtType}
          onClose={() => setShowDebtTypeSelector(false)}
        />
      )}

      {showAccountTypeSelector && (
        <AccountTypeSelector
          visible={showAccountTypeSelector}
          onSelect={handleSelectAccountType}
          onClose={() => setShowAccountTypeSelector(false)}
        />
      )}

      {showAddAccountModal && (
        <AddAccountModal
          visible={showAddAccountModal}
          accountType={selectedAccountType}
          onClose={() => setShowAddAccountModal(false)}
          onSave={handleSaveAccount}
        />
      )}

      {showAddGoalModal && (
        <AddGoalModal
          visible={showAddGoalModal}
          onClose={() => setShowAddGoalModal(false)}
          onSave={handleSaveGoal}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const fabStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 0,
    paddingBottom: 30,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  menuList: {
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
