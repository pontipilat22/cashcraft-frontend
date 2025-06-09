import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, TouchableWithoutFeedback, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { DatabaseService } from '../services/database';
import { Debt } from '../types';
import { Picker } from '@react-native-picker/picker';

interface EditDebtModalProps {
  visible: boolean;
  debt: Debt | null;
  mode: 'edit' | 'partial';
  onClose: () => void;
  onSave: () => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({ visible, debt, mode, onClose, onSave }) => {
  const { colors } = useTheme();
  const { accounts, refreshData } = useData();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);

  // Фильтруем счета для отображения
  const availableAccounts = accounts.filter(acc => 
    acc.type === 'cash' || acc.type === 'card' || acc.type === 'bank'
  );

  useEffect(() => {
    if (debt) {
      setName(debt.name);
      setAmount(debt.amount.toString());
      setPayAmount('');
    }
    // Выбираем счет по умолчанию
    if (availableAccounts.length > 0) {
      const defaultAccount = availableAccounts.find(acc => acc.isDefault) || availableAccounts[0];
      setSelectedAccountId(defaultAccount.id);
    }
  }, [debt, availableAccounts]);

  const handleSave = async () => {
    if (!debt) return;
    setLoading(true);

    try {
      if (mode === 'edit') {
        await DatabaseService.updateDebt(debt.id, {
          name: name.trim(),
          amount: parseFloat(amount),
        });
      } else {
        // Частичное погашение
        const paymentAmount = parseFloat(payAmount);
        const newAmount = debt.amount - paymentAmount;
        
        // Проверяем достаточность средств при списании
        if (debt.type === 'owe' && selectedAccountId) {
          const account = accounts.find(acc => acc.id === selectedAccountId);
          if (account && account.balance < paymentAmount) {
            Alert.alert('Ошибка', 'Недостаточно средств на счете');
            setLoading(false);
            return;
          }
        }
        
        // Создаём транзакцию
        if (selectedAccountId) {
          await DatabaseService.createTransaction({
            amount: paymentAmount,
            type: debt.type === 'owed' ? 'income' : 'expense',
            accountId: selectedAccountId,
            categoryId: debt.type === 'owed' ? 'other_income' : 'other_expense',
            description: `Погашение долга: ${debt.name}`,
            date: new Date().toISOString(),
          });
          // Обновляем данные для отображения нового баланса
          await refreshData();
        }
        
        if (newAmount <= 0) {
          await DatabaseService.deleteDebt(debt.id);
        } else {
          await DatabaseService.updateDebt(debt.id, {
            amount: newAmount,
          });
        }
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'edit' ? 'Редактировать долг' : 'Частичное погашение';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: colors.card }]}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              
              {mode === 'edit' ? (
                <>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Имя"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Сумма"
                    placeholderTextColor={colors.textSecondary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.debtInfo, { color: colors.text }]}>
                    {debt?.name}: {debt?.amount.toLocaleString('ru-RU')} ₽
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Сумма погашения"
                    placeholderTextColor={colors.textSecondary}
                    value={payAmount}
                    onChangeText={setPayAmount}
                    keyboardType="numeric"
                  />
                  {availableAccounts.length > 0 && (
                    <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
                      <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                        {debt?.type === 'owed' ? 'Зачислить на счет:' : 'Списать со счета:'}
                      </Text>
                      <Picker
                        selectedValue={selectedAccountId}
                        onValueChange={setSelectedAccountId}
                        style={[styles.picker, { color: colors.text }]}
                      >
                        {availableAccounts.map(account => (
                          <Picker.Item 
                            key={account.id} 
                            label={account.name} 
                            value={account.id} 
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: colors.primary }]} 
                  onPress={handleSave} 
                  disabled={loading || (mode === 'partial' && !payAmount)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {mode === 'edit' ? 'Сохранить' : 'Погасить'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.border }]} onPress={onClose}>
                  <Text style={{ color: colors.text }}>Отмена</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  debtInfo: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  pickerLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
}); 