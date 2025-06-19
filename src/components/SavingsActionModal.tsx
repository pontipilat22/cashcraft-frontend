import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { Account } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface SavingsActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  action: 'add' | 'withdraw';
  savings: Account;
  linkedAccount?: Account;
}

export const SavingsActionModal: React.FC<SavingsActionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  action,
  savings,
  linkedAccount,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const [amount, setAmount] = useState('');

  const handleConfirm = () => {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      onConfirm(parsedAmount);
      setAmount('');
      onClose();
    }
  };

  const maxAmount = action === 'withdraw' ? (savings.savedAmount || 0) : (linkedAccount?.balance || 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {action === 'add' ? t('accounts.addToSavings') : t('accounts.withdrawFromSavings')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {savings.name}
            </Text>

            {linkedAccount && (
              <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {action === 'add' 
                    ? t('accounts.availableOnAccount', { 
                        account: linkedAccount.name, 
                        amount: formatAmount(linkedAccount.balance, linkedAccount.currency) 
                      })
                    : t('accounts.savedAmount', { 
                        amount: formatAmount(savings.savedAmount || 0, savings.currency) 
                      })
                  }
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('transactions.amount')}
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoFocus
              />
              {maxAmount > 0 && (
                <TouchableOpacity
                  style={[styles.maxButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setAmount(maxAmount.toString())}
                >
                  <Text style={[styles.maxButtonText, { color: colors.primary }]}>
                    MAX
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { 
                  backgroundColor: action === 'add' ? colors.primary : colors.textSecondary,
                  opacity: parseFloat(amount) > 0 ? 1 : 0.5,
                }]}
                onPress={handleConfirm}
                disabled={parseFloat(amount) <= 0}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  {action === 'add' ? t('accounts.deposit') : t('accounts.withdraw')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 24,
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
  maxButton: {
    position: 'absolute',
    right: 8,
    top: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 