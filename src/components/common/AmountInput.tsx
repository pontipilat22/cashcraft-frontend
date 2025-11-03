import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCIES } from '../../config/currencies';
import { validateNumericInput } from '../../utils/numberInput';
import { modalStyles } from '../../styles/modalStyles';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  currency?: string;
  isIncome?: boolean;
  showError?: boolean;
  errorMessage?: string;
}

/**
 * Компонент для ввода суммы с символом валюты
 */
export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  placeholder = '0',
  currency,
  isIncome,
  showError = false,
  errorMessage,
}) => {
  const { colors } = useTheme();
  const { defaultCurrency } = useCurrency();

  const actualCurrency = currency || defaultCurrency;
  const currencySymbol = CURRENCIES[actualCurrency]?.symbol || '$';

  const handleChange = (text: string) => {
    const validText = validateNumericInput(text);
    onChangeText(validText);
  };

  const symbolColor = isIncome !== undefined
    ? (isIncome ? '#4CAF50' : colors.primary)
    : colors.primary;

  const prefix = isIncome !== undefined
    ? (isIncome ? '+' : '-') + currencySymbol
    : currencySymbol;

  return (
    <View style={styles.container}>
      <View style={[
        modalStyles.amountInput,
        {
          backgroundColor: colors.background,
          borderColor: showError ? '#FF4444' : colors.border,
        }
      ]}>
        <Text style={[modalStyles.currencySymbol, { color: symbolColor }]}>
          {prefix}
        </Text>
        <TextInput
          style={[modalStyles.amountTextInput, { color: colors.text }]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
        />
      </View>
      {showError && errorMessage && (
        <Text style={modalStyles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
