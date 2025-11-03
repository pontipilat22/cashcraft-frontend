import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useDatePicker } from '../../hooks/useDatePicker';
import { modalStyles } from '../../styles/modalStyles';

interface DatePickerFieldProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  formatDate?: (date: Date) => string;
  showError?: boolean;
  errorMessage?: string;
}

/**
 * Компонент для выбора даты
 */
export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  formatDate,
  showError = false,
  errorMessage,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();

  const datePicker = useDatePicker({
    initialDate: value,
    onDateChange: onChange,
  });

  const defaultFormatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('transactions.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('transactions.yesterday');
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formattedDate = formatDate ? formatDate(value) : defaultFormatDate(value);

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
          onPress={datePicker.openDatePicker}
        >
          <View style={modalStyles.selectorContent}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={[modalStyles.selectorText, { color: colors.text }]}>
              {formattedDate}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {showError && errorMessage && (
          <Text style={modalStyles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Android DatePicker */}
      {datePicker.showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePicker.selectedDate}
          mode="date"
          display="default"
          onChange={datePicker.handleDateChange}
        />
      )}

      {/* iOS DatePicker */}
      {datePicker.showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={datePicker.showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity
            style={modalStyles.datePickerOverlay}
            activeOpacity={1}
            onPress={datePicker.closeDatePicker}
          >
            <View style={[modalStyles.datePickerContent, { backgroundColor: colors.card }]}>
              <View style={[modalStyles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={datePicker.closeDatePicker}>
                  <Text style={[modalStyles.datePickerButton, { color: colors.primary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={datePicker.closeDatePicker}>
                  <Text style={[modalStyles.datePickerButton, { color: colors.primary }]}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={datePicker.selectedDate}
                mode="date"
                display="spinner"
                onChange={datePicker.handleDateChange}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
