import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

interface UseDatePickerOptions {
  onDateChange?: (date: Date) => void;
  initialDate?: Date;
}

/**
 * Универсальный хук для работы с DateTimePicker
 * Решает все проблемы с выбором даты на Android
 */
export const useDatePicker = (options?: UseDatePickerOptions) => {
  const { onDateChange, initialDate } = options || {};
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  
  // Защита от множественных открытий
  const isOpeningRef = useRef(false);
  const lastOpenTimeRef = useRef(0);
  
  const openDatePicker = useCallback(() => {
    const now = Date.now();
    
    // Защита от множественных вызовов в течение 500ms
    if (now - lastOpenTimeRef.current < 500) {
      console.log('🚫 [useDatePicker] Blocked: Too fast consecutive calls');
      return;
    }
    
    // Защита от одновременных вызовов
    if (isOpeningRef.current) {
      console.log('🚫 [useDatePicker] Blocked: Already opening');
      return;
    }
    
    console.log('✅ [useDatePicker] Opening DatePicker');
    isOpeningRef.current = true;
    lastOpenTimeRef.current = now;
    setShowDatePicker(true);
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 100);
  }, []);
  
  const closeDatePicker = useCallback(() => {
    console.log('✅ [useDatePicker] Closing DatePicker');
    isOpeningRef.current = false;
    setShowDatePicker(false);
  }, []);
  
  const handleDateChange = useCallback((event: any, date?: Date) => {
    console.log('📅 [useDatePicker] DatePicker onChange:', {
      eventType: event?.type,
      date: date?.toISOString(),
      platform: Platform.OS,
      nativeEvent: event?.nativeEvent
    });
    
    // ВАЖНО: На Android всегда закрываем пикер ПОСЛЕ обработки даты
    if (Platform.OS === 'android') {
      // Универсальная логика для Android:
      // 1. Если есть дата и событие НЕ dismissed - сохраняем дату
      // 2. Если тип события undefined (на некоторых устройствах) - тоже сохраняем
      if (date) {
        const shouldSetDate = event?.type === 'set' || 
                             event?.type === undefined ||
                             (event?.type !== 'dismissed' && event?.type !== 'cancel');
        
        if (shouldSetDate) {
          console.log('✅ [useDatePicker] Setting date:', date.toISOString());
          setSelectedDate(date);
          onDateChange?.(date);
        } else {
          console.log('❌ [useDatePicker] Date selection cancelled');
        }
      }
      
      // Закрываем пикер с небольшой задержкой для стабильности
      setTimeout(() => {
        closeDatePicker();
      }, 50);
    } else {
      // iOS: просто сохраняем дату если она есть
      if (date) {
        console.log('✅ [useDatePicker] Setting date (iOS):', date.toISOString());
        setSelectedDate(date);
        onDateChange?.(date);
      }
    }
  }, [onDateChange, closeDatePicker]);
  
  const resetProtection = useCallback(() => {
    console.log('🔄 [useDatePicker] Reset protection state');
    isOpeningRef.current = false;
    lastOpenTimeRef.current = 0;
  }, []);
  
  return {
    showDatePicker,
    selectedDate,
    openDatePicker,
    closeDatePicker,
    handleDateChange,
    setSelectedDate,
    resetProtection,
  };
};
