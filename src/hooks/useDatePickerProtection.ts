import { useRef, useCallback } from 'react';

/**
 * Хук для защиты от множественного открытия DateTimePicker
 * Предотвращает спам-клики и race conditions
 */
export const useDatePickerProtection = () => {
  const isOpeningRef = useRef(false);
  const lastOpenTimeRef = useRef(0);
  
  const protectedOpen = useCallback((openFunction: () => void) => {
    const now = Date.now();
    
    // Защита от множественных вызовов в течение 500ms
    if (now - lastOpenTimeRef.current < 500) {
      console.log('🚫 [DatePickerProtection] Blocked: Too fast consecutive calls');
      return false;
    }
    
    // Защита от одновременных вызовов
    if (isOpeningRef.current) {
      console.log('🚫 [DatePickerProtection] Blocked: Already opening');
      return false;
    }
    
    console.log('✅ [DatePickerProtection] Allowing DatePicker open');
    isOpeningRef.current = true;
    lastOpenTimeRef.current = now;
    
    // Выполняем открытие
    openFunction();
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 100);
    
    return true;
  }, []);
  
  const protectedClose = useCallback((closeFunction: () => void) => {
    console.log('✅ [DatePickerProtection] Closing DatePicker');
    isOpeningRef.current = false;
    closeFunction();
  }, []);
  
  const resetProtection = useCallback(() => {
    console.log('🔄 [DatePickerProtection] Reset protection state');
    isOpeningRef.current = false;
    lastOpenTimeRef.current = 0;
  }, []);
  
  return {
    protectedOpen,
    protectedClose,
    resetProtection,
  };
};
