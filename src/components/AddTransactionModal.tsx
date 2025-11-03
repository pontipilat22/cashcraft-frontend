import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { useBudgetContext } from '../context/BudgetContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { AddCategoryModal } from './AddCategoryModal';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { AmountInput } from './common/AmountInput';
import { DatePickerField } from './common/DatePickerField';
import { AccountPicker } from './common/AccountPicker';
import { CategoryPicker } from './common/CategoryPicker';
import { InputField } from './common/InputField';
import { modalStyles } from '../styles/modalStyles';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  isBudgetEnabled?: boolean;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  initialType,
  isBudgetEnabled = false,
}) => {
  const { colors } = useTheme();
  const { accounts, categories, createTransaction } = useData();
  const { t } = useLocalization();
  const { processIncome, recordExpense, reloadData } = useBudgetContext();
  const { trackTransaction } = useInterstitialAd();

  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [includeBudget, setIncludeBudget] = useState(false);

  // Состояние для валидации
  const [errors, setErrors] = useState<{
    amount?: boolean;
    account?: boolean;
    category?: boolean;
  }>({});
  const [showErrors, setShowErrors] = useState(false);

  // Устанавливаем тип транзакции при открытии
  React.useEffect(() => {
    if (visible && initialType) {
      console.log('📝 [AddTransactionModal] Opening with:', {
        initialType,
        isBudgetEnabled,
        willSetIncludeBudget: initialType === 'income' && isBudgetEnabled
      });
      setIsIncome(initialType === 'income');
      // Если это доход и бюджет включен, сразу устанавливаем includeBudget
      if (initialType === 'income' && isBudgetEnabled) {
        setIncludeBudget(true);
      }
    }
  }, [visible, initialType, isBudgetEnabled]);

  // Управляем includeBudget при смене типа транзакции
  React.useEffect(() => {
    if (!isIncome) {
      setIncludeBudget(false);
    } else if (isIncome && isBudgetEnabled && visible) {
      // Автоматически включаем для доходов если система бюджета активна
      setIncludeBudget(true);
    }
  }, [isIncome, isBudgetEnabled, visible]);

  // Устанавливаем счет по умолчанию при открытии модального окна
  React.useEffect(() => {
    const availableAccounts = accounts.filter(acc => acc.type !== 'savings');
    if (visible && availableAccounts.length > 0) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || availableAccounts[0].id);
    }
  }, [visible, accounts]);

  // Фильтруем категории по типу транзакции
  const filteredCategories = categories.filter(cat => cat.type === (isIncome ? 'income' : 'expense'));

  // Устанавливаем счет по умолчанию или первый счет
  React.useEffect(() => {
    const availableAccounts = accounts.filter(acc => acc.type !== 'savings');
    if (availableAccounts.length > 0 && !selectedAccountId) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault);
      setSelectedAccountId(defaultAccount?.id || availableAccounts[0].id);
    }
  }, [accounts]);

  React.useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(filteredCategories[0].id);
    } else if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === selectedCategoryId)) {
      // Если текущая категория не подходит для нового типа, выбираем первую
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [isIncome]);

  // Function to determine if a category is essential
  const isEssentialCategory = (category: any) => {
    if (!category) return false;

    // If category has budgetCategory field, use it
    if (category.budgetCategory) {
      return category.budgetCategory === 'essential';
    }

    // Otherwise, determine by category name (basic logic)
    const essentialKeywords = [
      'продукты', 'еда', 'food', 'groceries', 'utilities', 'коммунальные',
      'аренда', 'rent', 'mortgage', 'ипотека', 'транспорт', 'transport',
      'медицина', 'medicine', 'health', 'здоровье', 'образование', 'education',
      'налоги', 'taxes', 'страховка', 'insurance'
    ];

    const categoryName = category.name?.toLowerCase() || '';
    return essentialKeywords.some(keyword => categoryName.includes(keyword));
  };

  const handleSave = async () => {
    // Валидация обязательных полей
    const newErrors: typeof errors = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = true;
    }

    if (!selectedAccountId) {
      newErrors.account = true;
    }

    if (!selectedCategoryId) {
      newErrors.category = true;
    }

    setErrors(newErrors);

    // Если есть ошибки, показываем их и не сохраняем
    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const transactionAmount = parseFloat(amount);

      // If it's income and budget tracking is enabled, process the income distribution
      if (isIncome && includeBudget) {
        await processIncome(transactionAmount, true);
      }

      // If it's expense and budget is enabled, record the expense
      if (!isIncome && isBudgetEnabled) {
        // Determine if expense is essential or non-essential based on category
        const isEssentialExpense = isEssentialCategory(selectedCategory);
        console.log('🏷️ [AddTransactionModal] Category classification:', {
          categoryName: selectedCategory?.name,
          categoryBudgetCategory: selectedCategory?.budgetCategory,
          isEssentialExpense,
          transactionAmount
        });
        await recordExpense(transactionAmount, isEssentialExpense ? 'essential' : 'nonEssential');
      }

      await createTransaction({
        amount: transactionAmount,
        type: isIncome ? 'income' : 'expense',
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        description: description.trim() || undefined,
        date: selectedDate.toISOString(),
        includeBudget: isIncome ? includeBudget : undefined,
      });

      // Принудительно обновляем данные бюджета после создания транзакции
      await reloadData();

      console.log('✅ [AddTransactionModal] Transaction created and budget data reloaded');

      // Отслеживаем создание транзакции для рекламы (каждые 6 транзакций)
      await trackTransaction();

      // Очищаем форму и ошибки
      setAmount('');
      setDescription('');
      setIsIncome(false);
      setIncludeBudget(false);
      setErrors({});
      setShowErrors(false);
      setSelectedDate(new Date());
      setSelectedCategoryId('');
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setIsIncome(false);
    setIncludeBudget(false);
    setErrors({});
    setShowErrors(false);
    setSelectedDate(new Date());
    setSelectedCategoryId('');
    onClose();
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountCurrency = selectedAccount?.currency;

  return (
    <>
      <ModalWrapper
        visible={visible}
        onClose={handleClose}
        title={t('transactions.addTransaction')}
        footer={
          <ModalFooter
            onCancel={handleClose}
            onSave={handleSave}
            saveColor={isIncome ? '#4CAF50' : colors.primary}
            saveDisabled={!amount || parseFloat(amount) === 0}
          />
        }
      >
        {/* РЯД 1: Счет (слева) + Переключатель доход/расход (справа, вертикально) */}
        <View style={styles.row}>
          {/* Счет */}
          <View style={styles.rowItemLeft}>
            <AccountPicker
              value={selectedAccountId}
              onChange={(accountId) => {
                setSelectedAccountId(accountId);
                if (showErrors && errors.account) {
                  setErrors(prev => ({ ...prev, account: false }));
                }
              }}
              filterAccounts={(acc) => acc.type !== 'savings'}
              showBalance={true}
              showError={showErrors && errors.account}
              errorMessage={t('validation.accountRequired')}
            />
          </View>

          {/* Переключатель типа транзакции - вертикально */}
          <View style={styles.rowItemRightVertical}>
            <TouchableOpacity
              style={[
                styles.typeButtonVertical,
                !isIncome && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setIsIncome(false)}
            >
              <Ionicons name="remove-circle-outline" size={18} color={!isIncome ? '#fff' : colors.text} />
              <Text style={[
                styles.typeButtonTextVertical,
                { color: !isIncome ? '#fff' : colors.text }
              ]}>
                {t('transactions.expense')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButtonVertical,
                isIncome && { backgroundColor: '#4CAF50' },
                { borderColor: colors.border, marginTop: 8 }
              ]}
              onPress={() => setIsIncome(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={isIncome ? '#fff' : colors.text} />
              <Text style={[
                styles.typeButtonTextVertical,
                { color: isIncome ? '#fff' : colors.text }
              ]}>
                {t('transactions.income')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* РЯД 2: Дата (слева) + Категория (справа) */}
        <View style={styles.row}>
          {/* Дата */}
          <View style={styles.rowItemLeft}>
            <DatePickerField
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </View>

          {/* Категория */}
          <View style={styles.rowItemRight}>
            <CategoryPicker
              value={selectedCategoryId}
              onChange={(categoryId) => {
                setSelectedCategoryId(categoryId);
                if (showErrors && errors.category) {
                  setErrors(prev => ({ ...prev, category: false }));
                }
              }}
              type={isIncome ? 'income' : 'expense'}
              showError={showErrors && errors.category}
              errorMessage={t('validation.categoryRequired')}
              onAddCategory={() => setShowAddCategoryModal(true)}
            />
          </View>
        </View>

        {/* Budget System Toggle - только для доходов */}
        {isIncome && isBudgetEnabled && (
          <View style={modalStyles.inputContainer}>
            <View style={[styles.budgetToggleContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.budgetToggleInfo}>
                <Text style={[modalStyles.label, { color: colors.textSecondary, fontSize: 13 }]}>
                  {t('plans.includeBudgetSystem')}
                </Text>
                <Text style={[styles.budgetToggleSubtitle, { color: colors.textSecondary, fontSize: 11 }]}>
                  {includeBudget ? t('plans.budgetTrackingEnabled') : t('plans.budgetTrackingDisabled')}
                </Text>
              </View>
              <Switch
                value={includeBudget}
                onValueChange={setIncludeBudget}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (includeBudget ? '#fff' : '#f4f3f4') : undefined}
              />
            </View>
          </View>
        )}

        {/* РЯД 3: Сумма */}
        <AmountInput
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (showErrors && errors.amount && text && parseFloat(text) > 0) {
              setErrors(prev => ({ ...prev, amount: false }));
            }
          }}
          currency={accountCurrency}
          isIncome={isIncome}
          showError={showErrors && errors.amount}
          errorMessage={t('validation.amountRequired')}
        />

        {/* РЯД 4: Описание (необязательное) */}
        <InputField
          value={description}
          onChangeText={setDescription}
          placeholder={`${t('transactions.description')} (${t('common.optional')})`}
        />
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
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  rowItemLeft: {
    flex: 1,
  },
  rowItemRight: {
    flex: 1,
  },
  rowItemRightVertical: {
    width: 120,
    justifyContent: 'center',
  },
  typeButtonVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeButtonTextVertical: {
    fontSize: 12,
    fontWeight: '500',
  },
  budgetToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetToggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  budgetToggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
