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
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { Account } from '../types';

interface EditAccountModalProps {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSave: (accountId: string, data: { 
    name: string; 
    balance: number; 
    cardNumber?: string;
    isDefault?: boolean;
    isIncludedInTotal?: boolean;
  }) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  account,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBalance(account.balance.toString());
      setCardNumber(account.cardNumber || '');
      setIsDefault(account.isDefault || false);
      setIsIncludedInTotal(account.isIncludedInTotal !== false);
    }
  }, [account]);

  const handleSave = () => {
    if (!name.trim() || !account) return;

    onSave(account.id, {
      name: name.trim(),
      balance: parseFloat(balance) || 0,
      cardNumber: cardNumber.trim() || undefined,
      isDefault,
      isIncludedInTotal,
    });

    onClose();
  };

  const getIcon = () => {
    if (!account) return 'wallet-outline';
    
    switch (account.type) {
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

  if (!account) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Редактировать счет
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name={getIcon()} size={32} color="#fff" />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Название</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder="Название счета"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {Boolean(account.type === 'card' || account.type === 'credit') && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Последние 4 цифры карты</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="0000"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={4}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}> 
                {Boolean(account.type === 'debt' || account.type === 'credit') ? 'Сумма долга' : 'Баланс'}
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={balance}
                onChangeText={setBalance}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Счет по умолчанию
                </Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                Этот счет будет выбран при добавлении транзакций
              </Text>
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Учитывать в общем балансе
                </Text>
                <Switch
                  value={isIncludedInTotal}
                  onValueChange={setIsIncludedInTotal}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                Баланс этого счета будет включен в общий баланс
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Сохранить</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  switchDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
}); 