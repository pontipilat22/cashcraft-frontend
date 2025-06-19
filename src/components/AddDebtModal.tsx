import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { Debt } from '../types';

interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingDebt?: Debt | null;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  onSave,
  editingDebt,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const [type, setType] = useState<'owed_to_me' | 'owed_by_me'>('owed_to_me');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type);
      setName(editingDebt.name);
      setAmount(editingDebt.amount.toString());
      setIsIncludedInTotal(editingDebt.isIncludedInTotal !== false);
      setDueDate(editingDebt.dueDate ? new Date(editingDebt.dueDate) : undefined);
    } else {
      // Сброс формы для нового долга
      setType('owed_to_me');
      setName('');
      setAmount('');
      setIsIncludedInTotal(true);
      setDueDate(undefined);
    }
  }, [editingDebt, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('debts.nameError'));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error'), t('debts.amountError'));
      return;
    }

    onSave({
      type,
      name: name.trim(),
      amount: numAmount,
      isIncludedInTotal,
      dueDate: dueDate?.toISOString(),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingDebt ? t('debts.editDebt') : t('debts.newDebt')}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Тип долга */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.debtType')}
              </Text>
              <View style={[styles.segmentedControl, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    type === 'owed_to_me' && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setType('owed_to_me')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: type === 'owed_to_me' ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {t('debts.owedToMe')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    type === 'owed_by_me' && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setType('owed_by_me')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: type === 'owed_by_me' ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {t('debts.iOwe')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Имя должника */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {type === 'owed_to_me' ? t('debts.whoOwes') : t('debts.toWhomOwe')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder={type === 'owed_to_me' ? t('debts.debtorName') : t('debts.creditorName')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Сумма */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.amount')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[styles.currency, { color: colors.textSecondary }]}>₽</Text>
              </View>
            </View>

            {/* Дата возврата */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('debts.dueDate')}
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.card }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.dateText,
                    { color: dueDate ? colors.text : colors.textSecondary },
                  ]}
                >
                  {dueDate ? formatDate(dueDate) : t('debts.selectDate')}
                </Text>
                {dueDate && (
                  <TouchableOpacity
                    onPress={() => setDueDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Включить в общий баланс */}
            <View style={[styles.switchRow, { backgroundColor: colors.card }]}>
              <View style={styles.switchLeft}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  {t('debts.includeInBalance')}
                </Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  {t('debts.includeInBalanceDescription')}
                </Text>
              </View>
              <Switch
                value={isIncludedInTotal}
                onValueChange={setIsIncludedInTotal}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>
          </ScrollView>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDueDate(selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 70,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    width: 70,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  currency: {
    fontSize: 16,
    marginLeft: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  switchLeft: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
}); 