import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { validateNumericInput } from '../utils/numberInput';
import { modalStyles } from '../styles/modalStyles';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { InputField } from './common/InputField';
import { Account, AccountType } from '../types/index';

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
  const { t } = useLocalization();
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
    if (!account || !name.trim()) return;

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
        if (accountType === 'investment') {
          return 'analytics';
        }
        return 'wallet';
    }
  };

  if (!account) return null;

  return (
    <ModalWrapper
      visible={visible}
      onClose={onClose}
      title={t('accounts.editAccount')}
      showScrollView={false}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={modalStyles.iconContainer}>
          <View style={[modalStyles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name={getIcon()} size={32} color="#fff" />
          </View>
        </View>

        {/* Account Name */}
        <InputField
          label={t('accounts.accountName')}
          value={name}
          onChangeText={setName}
          placeholder={t('accounts.accountNamePlaceholder')}
        />

        {/* Card Number (for cards and credits only) */}
        {(account.type === 'card' || account.type === 'credit') && (
          <InputField
            label={t('accounts.cardNumber') + ' (необязательно)'}
            value={cardNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              if (cleaned.length <= 4) {
                setCardNumber(cleaned);
              }
            }}
            placeholder="Последние 4 цифры"
            maxLength={4}
            keyboardType="numeric"
          />
        )}

        {/* Balance */}
        <InputField
          label={
            (account.type === 'debt' || account.type === 'credit')
              ? t('accounts.debtAmount')
              : t('accounts.balance')
          }
          value={balance}
          onChangeText={(text) => setBalance(validateNumericInput(text))}
          placeholder="0"
          keyboardType="numeric"
        />

        {/* Default Account Switch */}
        <View style={modalStyles.switchContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[modalStyles.switchLabel, { color: colors.text, flex: 1 }]}>
              {t('accounts.defaultAccount')}
            </Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
          <Text style={[{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }]}>
            {t('accounts.defaultAccountDescription')}
          </Text>
        </View>

        {/* Include in Balance Switch */}
        <View style={modalStyles.switchContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[modalStyles.switchLabel, { color: colors.text, flex: 1 }]}>
              {t('accounts.includeInBalance')}
            </Text>
            <Switch
              value={isIncludedInTotal}
              onValueChange={setIsIncludedInTotal}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
          <Text style={[{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }]}>
            {t('accounts.includeInBalanceDescription')}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saveDisabled={!name.trim()}
      />
    </ModalWrapper>
  );
};
