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
import { modalStyles } from '../../styles/modalStyles';

interface CurrencyPickerProps {
  label?: string;
  value: string;
  onChange: (currency: string) => void;
  showError?: boolean;
  errorMessage?: string;
}

/**
 * Компонент для выбора валюты
 */
export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  label,
  value,
  onChange,
  showError = false,
  errorMessage,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { currencies } = useCurrency();
  const [showPicker, setShowPicker] = useState(false);

  const selectedCurrency = currencies[value];

  const handleSelect = (currency: string) => {
    onChange(currency);
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
            <Text style={[modalStyles.selectorText, { color: colors.text }]}>
              {selectedCurrency?.symbol} {value} - {selectedCurrency?.name}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {showError && errorMessage && (
          <Text style={modalStyles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Currency Picker Modal */}
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
                {label || t('accounts.selectCurrency')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={modalStyles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {Object.entries(currencies).map(([code, currency]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.currencyItem,
                    { backgroundColor: colors.background },
                    value === code && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => handleSelect(code)}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={[styles.currencySymbol, { color: colors.text }]}>
                      {currency.symbol}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.currencyCode, { color: colors.text }]}>
                        {code}
                      </Text>
                      <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                        {currency.name}
                      </Text>
                    </View>
                    {value === code && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
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
  currencyItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
});
