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
import { useLocalization } from '../context/LocalizationContext';
import { Account, AccountType } from '../types';

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
    isTargetedSavings?: boolean;
    targetAmount?: number;
  }) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  account,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [isTargetedSavings, setIsTargetedSavings] = useState(true);
  const [targetAmount, setTargetAmount] = useState('');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBalance(account.balance.toString());
      setCardNumber(account.cardNumber || '');
      setIsDefault(account.isDefault || false);
      setIsIncludedInTotal(account.isIncludedInTotal !== false);
      setIsTargetedSavings((account as any).isTargetedSavings !== false);
      setTargetAmount(account.targetAmount?.toString() || '');
    }
  }, [account]);

  const handleSave = () => {
    if (!account || !name.trim()) return;

    const saveData: any = {
      name: name.trim(),
      balance: parseFloat(balance) || 0,
      cardNumber: cardNumber.trim() || undefined,
      isDefault,
      isIncludedInTotal,
    };

    if (account.type === 'savings') {
      saveData.isTargetedSavings = isTargetedSavings;
      if (isTargetedSavings && targetAmount) {
        saveData.targetAmount = parseFloat(targetAmount) || 0;
      }
    }

    onSave(account.id, saveData);

    onClose();
  };

  const getIcon = () => {
    if (!account) return 'wallet';
    
    const accountType: AccountType = account.type;
    
    switch (accountType) {
      case 'cash':
        return 'cash';
      case 'card':
        return 'card';
      case 'bank':
        return 'business';
      case 'savings':
        return 'trending-up';
      case 'debt':
        return 'arrow-down';
      case 'credit':
        return 'arrow-up';
      default:
        // Handle investment and any other types
        if (accountType === 'investment') {
          return 'analytics';
        }
        return 'wallet';
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
              {t('accounts.editAccount')}
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.accountName')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder={t('accounts.accountNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {Boolean(account.type === 'card' || account.type === 'credit') && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('accounts.cardNumber')} (необязательно)</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={cardNumber}
                  onChangeText={(text) => {
                    // Разрешаем только цифры и максимум 4 символа
                    const cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length <= 4) {
                      setCardNumber(cleaned);
                    }
                  }}
                  placeholder="Последние 4 цифры"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={4}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}> 
                {Boolean(account.type === 'debt' || account.type === 'credit') ? t('accounts.debtAmount') : 
                 account.type === 'savings' ? t('accounts.savedAmount') : t('accounts.balance')}
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
                  {t('accounts.includeInBalance')}
                </Text>
                <Switch
                  value={isIncludedInTotal}
                  onValueChange={setIsIncludedInTotal}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                {t('accounts.includeInBalanceDescription')}
              </Text>
            </View>

            {account.type !== 'savings' && (
              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    {t('accounts.defaultAccount')}
                  </Text>
                  <Switch
                    value={isDefault}
                    onValueChange={setIsDefault}
                    trackColor={{ false: '#767577', true: colors.primary }}
                  />
                </View>
                <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                  {t('accounts.defaultAccountDescription')}
                </Text>
              </View>
            )}

            {account.type === 'savings' && (
              <>
                <View style={styles.switchContainer}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>
                      {t('accounts.targetedSavings') || 'Целевое накопление'}
                    </Text>
                    <Switch
                      value={isTargetedSavings}
                      onValueChange={setIsTargetedSavings}
                      trackColor={{ false: '#767577', true: colors.primary }}
                    />
                  </View>
                </View>

                {isTargetedSavings && (
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      {t('accounts.targetAmount')}
                    </Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      }]}
                      value={targetAmount}
                      onChangeText={setTargetAmount}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={!name.trim()}
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