import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useData } from '../../context/DataContext';
import { Account } from '../../types/index';
import { modalStyles } from '../../styles/modalStyles';

interface AccountPickerProps {
  label?: string;
  value?: string; // account id
  onChange: (accountId: string) => void;
  filterAccounts?: (account: Account) => boolean;
  showBalance?: boolean;
  showError?: boolean;
  errorMessage?: string;
  placeholder?: string;
}

/**
 * Компонент для выбора счета
 */
export const AccountPicker: React.FC<AccountPickerProps> = ({
  label,
  value,
  onChange,
  filterAccounts,
  showBalance = true,
  showError = false,
  errorMessage,
  placeholder,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { accounts } = useData();
  const { formatAmount, defaultCurrency } = useCurrency();
  const [showPicker, setShowPicker] = useState(false);

  const filteredAccounts = filterAccounts ? accounts.filter(filterAccounts) : accounts;
  const selectedAccount = accounts.find(acc => acc.id === value);

  const handleSelect = (accountId: string) => {
    onChange(accountId);
    setShowPicker(false);
  };

  return (
    <>
      <View style={styles.container}>
        {label && (
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
        )}
        <TouchableOpacity
          style={[
            modalStyles.selector,
            {
              backgroundColor: colors.background,
              borderColor: showError ? '#FF4444' : colors.border,
            }
          ]}
          onPress={() => setShowPicker(true)}
        >
          <View style={modalStyles.selectorContent}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={[modalStyles.selectorText, { color: selectedAccount ? colors.text : colors.textSecondary }]}>
              {selectedAccount?.name || placeholder || t('transactions.selectAccount')}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {showError && errorMessage && (
          <Text style={modalStyles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Account Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.pickerHeader}>
              <Text style={[modalStyles.pickerTitle, { color: colors.text }]}>
                {label || t('transactions.selectAccount')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={modalStyles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {filteredAccounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[modalStyles.pickerItem, { backgroundColor: colors.background }]}
                  onPress={() => handleSelect(account.id)}
                >
                  <Text style={[modalStyles.pickerItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  {showBalance && (
                    <Text style={[styles.balance, { color: colors.textSecondary }]}>
                      {formatAmount(account.balance, account.currency || defaultCurrency)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  balance: {
    fontSize: 14,
  },
});
