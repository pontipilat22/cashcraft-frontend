/**
 * Валидирует и очищает ввод для числовых полей
 * Разрешает только цифры и одну точку/запятую
 * @param text - введенный текст
 * @returns очищенный текст с только цифрами и точкой
 */
export const validateNumericInput = (text: string): string => {
  // Заменяем запятую на точку
  let cleaned = text.replace(/,/g, '.');

  // Разрешаем только цифры и точку
  cleaned = cleaned.replace(/[^0-9.]/g, '');

  // Разрешаем только одну точку
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  return cleaned;
};

/**
 * Форматирует число для отображения
 * @param value - числовое значение
 * @param decimals - количество знаков после запятой (по умолчанию 2)
 * @returns отформатированная строка
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};
