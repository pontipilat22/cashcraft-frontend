import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useDatePicker } from '../hooks/useDatePicker';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  initialStartDate = new Date(),
  initialEndDate = new Date(),
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  
  // Используем новый хук для начальной даты
  const startDatePicker = useDatePicker({
    initialDate: initialStartDate,
    onDateChange: (date) => {
      // Если выбранная начальная дата позже конечной, обновляем конечную
      if (date > endDatePicker.selectedDate) {
        endDatePicker.setSelectedDate(date);
      }
    }
  });
  
  // Используем новый хук для конечной даты
  const endDatePicker = useDatePicker({
    initialDate: initialEndDate
  });
  
  const handleConfirm = () => {
    // Убедимся что конечная дата не раньше начальной
    if (endDatePicker.selectedDate >= startDatePicker.selectedDate) {
      onConfirm(startDatePicker.selectedDate, endDatePicker.selectedDate);
      onClose();
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('transactions.selectPeriod') || 'Выберите период'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateSection}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('transactions.startDate') || 'Начальная дата'}
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.background }]}
              onPress={startDatePicker.openDatePicker}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatDate(startDatePicker.selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateSection}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('transactions.endDate') || 'Конечная дата'}
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.background }]}
              onPress={endDatePicker.openDatePicker}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatDate(endDatePicker.selectedDate)}
              </Text>
            </TouchableOpacity>
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
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {t('common.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {startDatePicker.showDatePicker && (
            <DateTimePicker
              value={startDatePicker.selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              textColor={colors.text}
              accentColor={colors.primary}
              onChange={startDatePicker.handleDateChange}
            />
          )}
          
          {endDatePicker.showDatePicker && (
            <DateTimePicker
              value={endDatePicker.selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              textColor={colors.text}
              accentColor={colors.primary}
              minimumDate={startDatePicker.selectedDate}
              onChange={endDatePicker.handleDateChange}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
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