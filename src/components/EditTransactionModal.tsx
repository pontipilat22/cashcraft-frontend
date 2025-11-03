import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useBudgetContext } from '../context/BudgetContext';
import { Transaction } from '../types/index';
import { AddCategoryModal } from './AddCategoryModal';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { AmountInput } from './common/AmountInput';
import { DatePickerField } from './common/DatePickerField';
import { AccountPicker } from './common/AccountPicker';
import { CategoryPicker } from './common/CategoryPicker';
import { InputField } from './common/InputField';
import { modalStyles } from '../styles/modalStyles';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const { colors } = useTheme();
  const { accounts, categories, updateTransaction, transactions } = useData();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { reloadData: reloadBudgetData } = useBudgetContext();

  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // Проверяем, является ли транзакция переводом
  const isTransfer = transaction && (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense')
    && transaction.description?.match(/[→←]/);

  // Извлекаем чистое описание перевода (без стрелок и названий счетов)
  const getCleanTransferDescription = (desc: string) => {
    if (!desc) return '';
    // Удаляем стрелку и всё после неё
    const arrowIndex = desc.search(/[→←]/);
    if (arrowIndex === -1) return desc;
    return desc.substring(0, arrowIndex).trim();
  };

  // Для переводов нужно найти второй счет
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');

  // Заполняем форму данными транзакции
  useEffect(() => {
    if (transaction) {
      setIsIncome(transaction.type === 'income');
      setAmount(transaction.amount.toString());

      // Проверяем, является ли транзакция переводом
      const checkIsTransfer = (transaction.categoryId === 'other_income' || transaction.categoryId === 'other_expense')
        && transaction.description?.match(/[→←]/);

      // Для переводов используем чистое описание
      if (checkIsTransfer) {
        setDescription(getCleanTransferDescription(transaction.description || ''));

        // Для перевода нужно определить второй счет
        // Если это расход (→), то нужно найти парную доходную транзакцию
        // Если это доход (←), то нужно найти парную расходную транзакцию
        const findPairedTransferAccount = () => {
          // Находим все транзакции в эту же дату
          const sameDate = transactions.filter(t =>
            new Date(t.date).toDateString() === new Date(transaction.date).toDateString()
          );

          // Ищем парную транзакцию
          const pairedTransaction = sameDate.find(t => {
            if (t.id === transaction.id) return false;

            // Проверяем, что это перевод
            const isOtherTransfer = (t.categoryId === 'other_income' || t.categoryId === 'other_expense')
              && t.description?.match(/[→←]/);
            if (!isOtherTransfer) return false;

            // Проверяем, что описания совпадают (без учета стрелок и счетов)
            const otherCleanDesc = getCleanTransferDescription(t.description || '');
            const thisCleanDesc = getCleanTransferDescription(transaction.description || '');
            if (otherCleanDesc !== thisCleanDesc) return false;

            // Проверяем, что типы противоположные
            if (transaction.type === 'expense' && t.type === 'income') {
              return true;
            } else if (transaction.type === 'income' && t.type === 'expense') {
              return true;
            }

            return false;
          });

          if (pairedTransaction) {
            // Для расходной транзакции второй счет - это счет парной доходной транзакции
            // Для доходной транзакции второй счет - это счет парной расходной транзакции
            setTransferToAccountId(pairedTransaction.accountId);
          }
        };

        findPairedTransferAccount();
      } else {
        setDescription(transaction.description || '');
      }

      setSelectedAccountId(transaction.accountId);
      setSelectedCategoryId(transaction.categoryId || '');
      setSelectedDate(new Date(transaction.date));
    }
  }, [transaction?.id]); // Используем только id для избежания циклов

  const handleSave = async () => {
    if (!amount || !selectedAccountId || !transaction) return;

    try {
      if (isTransfer && transferToAccountId) {
        // Для переводов нужно обновить обе транзакции
        const cleanDesc = description.trim();

        // Находим парную транзакцию
        const pairedTransaction = transactions.find(t => {
          if (t.id === transaction.id) return false;

          const isOtherTransfer = (t.categoryId === 'other_income' || t.categoryId === 'other_expense')
            && t.description?.match(/[→←]/);
          if (!isOtherTransfer) return false;

          const otherCleanDesc = getCleanTransferDescription(t.description || '');
          const thisCleanDesc = getCleanTransferDescription(transaction.description || '');
          if (otherCleanDesc !== thisCleanDesc) return false;

          // Проверяем дату
          if (new Date(t.date).toDateString() !== new Date(transaction.date).toDateString()) return false;

          return (transaction.type === 'expense' && t.type === 'income') ||
            (transaction.type === 'income' && t.type === 'expense');
        });

        if (pairedTransaction) {
          // Определяем счета и валюты
          const fromAccount = transaction.type === 'expense'
            ? accounts.find(a => a.id === selectedAccountId)
            : accounts.find(a => a.id === transferToAccountId);
          const toAccount = transaction.type === 'expense'
            ? accounts.find(a => a.id === transferToAccountId)
            : accounts.find(a => a.id === selectedAccountId);

          if (!fromAccount || !toAccount) return;

          // Проверяем нужна ли конверсия валют
          let fromAmount = parseFloat(amount);
          let toAmount = fromAmount;

          // При переносе между счетами конвертируем сумму
          if (fromAccount.currency !== toAccount.currency) {
            try {
              const { ExchangeRateService } = await import('../services/exchangeRate');
              const exchangeRate = await ExchangeRateService.getRate(
                fromAccount.currency || defaultCurrency,
                toAccount.currency || defaultCurrency
              );

              if (exchangeRate) {
                toAmount = fromAmount * exchangeRate;
              } else {
                console.warn('No exchange rate found for conversion');
                // Используем исходную сумму если курс не найден
              }
            } catch (error) {
              console.error('Error getting exchange rate:', error);
              // Используем исходную сумму в случае ошибки
            }
          }

          // Обновляем расходную транзакцию
          const expenseTransaction = transaction.type === 'expense' ? transaction : pairedTransaction;
          const incomeTransaction = transaction.type === 'income' ? transaction : pairedTransaction;

          await updateTransaction(expenseTransaction.id, {
            amount: fromAmount,
            type: 'expense',
            accountId: fromAccount.id,
            categoryId: 'other_expense',
            description: cleanDesc ? `${cleanDesc} → ${toAccount.name}` : `→ ${toAccount.name}`,
            date: selectedDate.toISOString(),
          });

          // Обновляем доходную транзакцию
          await updateTransaction(incomeTransaction.id, {
            amount: toAmount,
            type: 'income',
            accountId: toAccount.id,
            categoryId: 'other_income',
            description: cleanDesc ? `${cleanDesc} ← ${fromAccount.name}` : `← ${fromAccount.name}`,
            date: selectedDate.toISOString(),
          });
        }
      } else {
        // Обычная транзакция
        await updateTransaction(transaction.id, {
          amount: parseFloat(amount),
          type: isIncome ? 'income' : 'expense',
          accountId: selectedAccountId,
          categoryId: selectedCategoryId || undefined,
          description: description.trim() || undefined,
          date: selectedDate.toISOString(),
        });
      }

      // Обновляем данные бюджета после изменения транзакции
      await reloadBudgetData();
      console.log('🔄 [EditTransactionModal] Данные бюджета обновлены после редактирования');

      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountCurrency = selectedAccount?.currency;

  if (!transaction) return null;

  return (
    <>
      <ModalWrapper
        visible={visible}
        onClose={onClose}
        title={t('transactions.editTransaction')}
        footer={
          <ModalFooter
            onCancel={onClose}
            onSave={handleSave}
            saveColor={isIncome ? '#4CAF50' : colors.primary}
            saveDisabled={!amount || parseFloat(amount) === 0}
          />
        }
      >
        {/* Для переводов показываем специальную метку */}
        {isTransfer && (
          <View style={modalStyles.inputContainer}>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
              {t('common.type')}
            </Text>
            <View style={[styles.transferLabel, { backgroundColor: '#2196F3' + '20' }]}>
              <Ionicons name="swap-horizontal" size={20} color="#2196F3" style={{ marginRight: 8 }} />
              <Text style={[styles.transferLabelText, { color: '#2196F3' }]}>
                {t('transactions.transfer')}
              </Text>
            </View>
          </View>
        )}

        {/* Переключатель типа транзакции (скрываем для переводов) */}
        {!isTransfer && (
          <View style={modalStyles.inputContainer}>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
              {t('common.type')}
            </Text>
            <View style={[styles.typeSwitch, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  !isIncome && { backgroundColor: colors.primary },
                ]}
                onPress={() => setIsIncome(false)}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: !isIncome ? '#fff' : colors.text }
                ]}>
                  {t('transactions.expense')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  isIncome && { backgroundColor: '#4CAF50' },
                ]}
                onPress={() => setIsIncome(true)}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: isIncome ? '#fff' : colors.text }
                ]}>
                  {t('transactions.income')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Сумма */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.amount')}
          </Text>
          <AmountInput
            value={amount}
            onChangeText={setAmount}
            currency={accountCurrency}
            isIncome={isIncome}
          />
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

        {/* Категория (скрываем для переводов) */}
        {!isTransfer && (
          <View style={modalStyles.inputContainer}>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
              {t('transactions.category')}
            </Text>
            <CategoryPicker
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              type={isIncome ? 'income' : 'expense'}
              onAddCategory={() => setShowAddCategoryModal(true)}
            />
          </View>
        )}

        {/* Счет */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {isTransfer && transaction?.type === 'expense' ? t('transactions.fromAccountLabel') : isTransfer && transaction?.type === 'income' ? t('transactions.toAccountLabel') : t('transactions.account')}
          </Text>
          <AccountPicker
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            showBalance={true}
          />
        </View>

        {/* Второй счет для переводов */}
        {isTransfer && (
          <View style={modalStyles.inputContainer}>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
              {transaction?.type === 'expense' ? t('transactions.toAccountLabel') : t('transactions.fromAccountLabel')}
            </Text>
            <AccountPicker
              value={transferToAccountId}
              onChange={setTransferToAccountId}
              filterAccounts={(acc) => acc.id !== selectedAccountId}
              showBalance={true}
              placeholder={t('transactions.selectAccount')}
            />
          </View>
        )}

        {/* Описание */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('transactions.description')} ({t('common.optional')})
          </Text>
          <InputField
            value={description}
            onChangeText={setDescription}
            placeholder={isIncome ? t('transactions.exampleIncome') : t('transactions.exampleExpense')}
          />
        </View>
      </ModalWrapper>

      <AddCategoryModal
        visible={showAddCategoryModal}
        type={isIncome ? 'income' : 'expense'}
        onClose={() => setShowAddCategoryModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  typeSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  transferLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  transferLabelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
