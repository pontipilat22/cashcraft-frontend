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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { Debt } from '../types';
import { CURRENCIES } from '../config/currencies';

interface EditDebtModalProps {
  visible: boolean;
  debt: Debt | null;
  mode: 'edit' | 'partial';
  onClose: () => void;
  onSave: () => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({ 
  visible, 
  debt, 
  mode, 
  onClose, 
  onSave 
}) => {
  const { colors } = useTheme();
  const { defaultCurrency } = useCurrency();
  const { t } = useLocalization();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Получаем символ валюты по умолчанию
  const currencySymbol = CURRENCIES[defaultCurrency]?.symbol || '$';

  useEffect(() => {
    if (debt) {
      setName(debt.name);
      setAmount(debt.amount.toString());
    }
  }, [debt]);

  const handleSave = async () => {
    if (!debt) return;
    
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('debts.nameError'));
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(t('common.error'), t('debts.amountError'));
      return;
    }
    
    setLoading(true);

    try {
      await LocalDatabaseService.updateDebt(debt.id, {
        ...debt,
        name,
        amount: Number(amount),
      });
      onSave();
      handleClose();
    } catch (error) {
      console.error('Error updating debt:', error);
      Alert.alert(t('common.error'), t('debts.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setAmount('');
    onClose();
  };

  if (!debt) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('debts.editDebt')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Тип долга - только для отображения */}
            <View style={styles.typeInfo}>
              <View style={[styles.typeInfoCard, { backgroundColor: colors.background }]}>
                <Ionicons 
                  name={debt.type === 'owed_to_me' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                  size={24} 
                  color={debt.type === 'owed_to_me' ? '#4CAF50' : '#FF5252'} 
                />
                <Text style={[styles.typeInfoText, { color: colors.text }]}>
                  {debt.type === 'owed_to_me' ? t('debts.owedToMe') : t('debts.iOwe')}
                </Text>
              </View>
            </View>

            {/* Сумма */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('debts.amount')}
              </Text>
              <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Человек */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {debt.type === 'owed_to_me' ? t('debts.whoOwes') : t('debts.toWhomOwe')}
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder={t('debts.personPlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Дата создания */}
            {debt.createdAt && (
              <View style={styles.infoContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t('debts.creationDate')}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(debt.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.saveButton, 
                { backgroundColor: colors.primary }
              ]}
              onPress={handleSave}
              disabled={loading || !name.trim() || !amount || parseFloat(amount) === 0}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  typeInfo: {
    marginBottom: 20,
  },
  typeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  typeInfoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '500',
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#F44336',
  },
}); 