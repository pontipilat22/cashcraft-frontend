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

export const BottomTabNavigatorWrapper: React.FC = () => {
  const { isFABMenuOpen, closeFABMenu } = useFAB();
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { createAccount, createGoal } = useData();
  const { reloadData: reloadBudgetData } = useBudgetContext();

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
  const [selectedDebtType, setSelectedDebtType] = useState<'owed_to_me' | 'owed_by_me'>('owed_to_me');

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

  const handleSelectDebtType = (type: 'owed_to_me' | 'owed_by_me') => {
    setSelectedDebtType(type);
    setShowDebtTypeSelector(false);
    setShowDebtModal(true);
  };

  const handleSelectAccountType = (type: AccountType) => {
    handleAddAccount(type);
  };

  const handleSaveAccount = async (accountData: any) => {
    await createAccount(accountData);
    await reloadBudgetData();
    setShowAddAccountModal(false);
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
          type={transactionType}
          onClose={() => setShowAddModal(false)}
          onSave={async () => {
            setShowAddModal(false);
            await reloadBudgetData();
          }}
        />
      )}

      {showTransferModal && (
        <TransferModal
          visible={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSave={async () => {
            setShowTransferModal(false);
            await reloadBudgetData();
          }}
        />
      )}

      {showDebtModal && (
        <DebtOperationModal
          visible={showDebtModal}
          type={selectedDebtType}
          onClose={() => setShowDebtModal(false)}
          onSave={async () => {
            setShowDebtModal(false);
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
