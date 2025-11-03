import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useBudgetContext } from '../context/BudgetContext';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { AmountInput } from './common/AmountInput';
import { DatePickerField } from './common/DatePickerField';
import { InputField } from './common/InputField';
import { modalStyles } from '../styles/modalStyles';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { accounts, goals, createTransaction, transferToGoal } = useData();
  const { formatAmount } = useCurrency();
  const { t } = useLocalization();
  const { reloadData: reloadBudgetData } = useBudgetContext();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFromAccountPicker, setShowFromAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);

  // Состояние для валидации
  const [errors, setErrors] = useState<{
    amount?: boolean;
    fromAccount?: boolean;
    toAccount?: boolean;
  }>({});
  const [showErrors, setShowErrors] = useState(false);

  // Фильтруем счета
  const sourceAccounts = accounts.filter(acc => acc.type !== 'savings');

  // Создаем список целей как псевдо-счетов для выбора
  const goalTargets = goals.map(goal => ({
    id: `goal-${goal.id}`,
    name: `🎯 ${goal.name}`,
    type: 'goal' as any,
    balance: goal.currentAmount,
    currency: goal.currency,
    isGoal: true,
    goalData: goal
  }));

  const targetAccounts = [
    ...accounts.filter(acc => acc.id !== fromAccountId),
    ...goalTargets
  ];

  useEffect(() => {
    if (!fromAccountId && sourceAccounts.length > 0) {
      setFromAccountId(sourceAccounts[0].id);
    }
  }, [sourceAccounts, fromAccountId]);

  const handleSave = async () => {
    // Валидация обязательных полей
    const newErrors: typeof errors = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = true;
    }

    if (!fromAccountId) {
      newErrors.fromAccount = true;
    }

    if (!toAccountId) {
      newErrors.toAccount = true;
    }

    setErrors(newErrors);

    // Если есть ошибки, показываем их и не сохраняем
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    try {
      const fromAccount = accounts.find(a => a.id === fromAccountId);
      const transferAmount = parseFloat(amount);
      const transferDate = selectedDate.toISOString();
      const transferDescription = description.trim() || t('transactions.transfer');

      if (!fromAccount) {
        console.error('Source account not found');
        return;
      }

      // Проверяем, это перевод в цель или между счетами
      const isGoalTransfer = toAccountId.startsWith('goal-');

      if (isGoalTransfer) {
        // Перевод в цель
        const goalId = toAccountId.replace('goal-', '');
        await transferToGoal(goalId, fromAccountId, transferAmount, transferDescription);
      } else {
        // Обычный перевод между счетами
        const toAccount = accounts.find(a => a.id === toAccountId);

        if (!toAccount) {
          console.error('Target account not found');
          return;
        }

        // Конвертируем сумму в валюту счета-получателя если валюты разные
        let toAmount = transferAmount;
        if (fromAccount.currency !== toAccount.currency) {
          // TODO: Использовать курсы обмена
          toAmount = transferAmount; // Пока без конвертации
        }

        // Создаем расходную транзакцию (в валюте счета-источника)
        await createTransaction({
          amount: transferAmount,
          type: 'expense',
          accountId: fromAccountId,
          categoryId: 'other_expense',
          description: `${transferDescription} → ${toAccount.name}`,
          date: transferDate,
        });

        // Создаем доходную транзакцию (в валюте счета-получателя)
        await createTransaction({
          amount: toAmount,
          type: 'income',
          accountId: toAccountId,
          categoryId: 'other_income',
          description: `${transferDescription} ← ${fromAccount.name}`,
          date: transferDate,
        });
      }

      // Обновляем данные бюджета после перевода
      await reloadBudgetData();
      console.log('🔄 [TransferModal] Данные бюджета обновлены после перевода');

      handleClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setFromAccountId(sourceAccounts.length > 0 ? sourceAccounts[0].id : '');
    setToAccountId('');
    setSelectedDate(new Date());
    setErrors({});
    setShowErrors(false);
    onClose();
  };

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = targetAccounts.find(a => a.id === toAccountId);
  const accountCurrency = fromAccount?.currency;

  return (
    <>
      <ModalWrapper
        visible={visible}
        onClose={handleClose}
        title={t('transactions.transfer')}
        footer={
          <ModalFooter
            onCancel={handleClose}
            onSave={handleSave}
            saveDisabled={!amount || parseFloat(amount) === 0 || !fromAccountId || !toAccountId || (fromAccountId === toAccountId && !toAccountId.startsWith('goal-'))}
          />
        }
      >
        {/* Сумма */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.amount')}
          </Text>
          <AmountInput
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (showErrors && errors.amount && text && parseFloat(text) > 0) {
                setErrors(prev => ({ ...prev, amount: false }));
              }
            }}
            currency={accountCurrency}
            showError={showErrors && errors.amount}
            errorMessage={t('validation.amountRequired')}
          />
        </View>

        {/* Со счета */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.fromAccount')}
          </Text>
          <TouchableOpacity
            style={[
              modalStyles.selector,
              {
                backgroundColor: colors.background,
                borderColor: showErrors && errors.fromAccount ? '#FF4444' : colors.border
              }
            ]}
            onPress={() => setShowFromAccountPicker(true)}
          >
            <Text style={[modalStyles.selectorText, { color: colors.text }]}>
              {fromAccount?.name || t('transactions.selectAccount')}
            </Text>
            <View style={styles.accountBalance}>
              {fromAccount && (
                <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                  {formatAmount(fromAccount.balance)}
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
          {showErrors && errors.fromAccount && (
            <Text style={modalStyles.errorText}>
              {t('validation.accountRequired')}
            </Text>
          )}
        </View>

        {/* На счет */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.toAccount')}
          </Text>
          <TouchableOpacity
            style={[
              modalStyles.selector,
              {
                backgroundColor: colors.background,
                borderColor: showErrors && errors.toAccount ? '#FF4444' : colors.border
              }
            ]}
            onPress={() => setShowToAccountPicker(true)}
            disabled={!fromAccountId}
          >
            <Text style={[modalStyles.selectorText, { color: !fromAccountId ? colors.textSecondary : colors.text }]}>
              {toAccount?.name || t('transactions.selectAccount')}
            </Text>
            <View style={styles.accountBalance}>
              {toAccount && (
                <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
                  {formatAmount(toAccount.balance)}
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
          {showErrors && errors.toAccount && (
            <Text style={modalStyles.errorText}>
              {t('validation.accountRequired')}
            </Text>
          )}
        </View>

        {/* Дата */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.date')}
          </Text>
          <DatePickerField
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </View>

        {/* Описание */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.description')} ({t('common.optional')})
          </Text>
          <InputField
            value={description}
            onChangeText={setDescription}
            placeholder={t('transactions.enterDescription')}
          />
        </View>
      </ModalWrapper>

      {/* From Account Picker */}
      <Modal
        visible={showFromAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFromAccountPicker(false)}
      >
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowFromAccountPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.pickerHeader}>
              <Text style={[modalStyles.pickerTitle, { color: colors.text }]}>
                {t('transactions.fromAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowFromAccountPicker(false)} style={modalStyles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sourceAccounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[modalStyles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setFromAccountId(account.id);
                    if (toAccountId === account.id) {
                      setToAccountId('');
                    }
                    setShowFromAccountPicker(false);
                  }}
                >
                  <Text style={[modalStyles.pickerItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                    {formatAmount(account.balance)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* To Account Picker */}
      <Modal
        visible={showToAccountPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToAccountPicker(false)}
      >
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowToAccountPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.pickerHeader}>
              <Text style={[modalStyles.pickerTitle, { color: colors.text }]}>
                {t('transactions.toAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowToAccountPicker(false)} style={modalStyles.pickerCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {/* Секция счетов */}
              {accounts.filter(acc => acc.id !== fromAccountId).length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      {t('accounts.accounts')}
                    </Text>
                  </View>
                  {accounts.filter(acc => acc.id !== fromAccountId).map(account => (
                    <TouchableOpacity
                      key={account.id}
                      style={[modalStyles.pickerItem, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setToAccountId(account.id);
                        setShowToAccountPicker(false);
                      }}
                    >
                      <Text style={[modalStyles.pickerItemText, { color: colors.text }]}>
                        {account.name}
                      </Text>
                      <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                        {formatAmount(account.balance)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Секция целей */}
              {goals.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      {t('accounts.goals')}
                    </Text>
                  </View>
                  {goalTargets.map(goal => (
                    <TouchableOpacity
                      key={goal.id}
                      style={[modalStyles.pickerItem, { backgroundColor: colors.background }]}
                      onPress={() => {
                        setToAccountId(goal.id);
                        setShowToAccountPicker(false);
                      }}
                    >
                      <Text style={[modalStyles.pickerItemText, { color: colors.text }]}>
                        {goal.name}
                      </Text>
                      <Text style={[styles.pickerItemBalance, { color: colors.textSecondary }]}>
                        {formatAmount(goal.balance)} / {formatAmount(goal.goalData?.targetAmount || 0)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  accountBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    marginRight: 8,
  },
  pickerItemBalance: {
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
