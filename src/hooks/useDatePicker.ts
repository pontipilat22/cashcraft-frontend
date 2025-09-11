// hooks/useDatePicker.ts
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type UseDatePickerOptions = {
  onDateChange?: (date: Date) => void;
  initialDate?: Date;
};

export const useDatePicker = (options?: UseDatePickerOptions) => {
  const { onDateChange, initialDate } = options || {};
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());

  const openDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const closeDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        if (event.type === 'dismissed') {
          closeDatePicker();
          return;
        }
        if (event.type === 'set' && date) {
          setSelectedDate(date);
          onDateChange?.(date);
          closeDatePicker();
        }
        return;
      }

      if (date) {
        setSelectedDate(date);
        onDateChange?.(date);
      }
    },
    [closeDatePicker, onDateChange]
  );

  return {
    showDatePicker,
    selectedDate,
    setSelectedDate,
    openDatePicker,
    closeDatePicker,
    handleDateChange,
  };
};
