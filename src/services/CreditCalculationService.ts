/**
 * Сервис для расчёта графиков платежей по кредитам
 * Поддерживает аннуитетные и дифференцированные платежи
 */

export interface CreditParams {
  principal: number; // Сумма кредита
  annualRate: number; // Годовая процентная ставка (%)
  termMonths: number; // Срок в месяцах
  startDate: Date; // Дата выдачи
  firstPaymentDate?: Date; // Дата первого платежа (опционально)
  paymentType: 'annuity' | 'differentiated'; // Тип платежа
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: Date;
  totalPayment: number; // Общий платёж
  principalPayment: number; // Платёж по телу кредита
  interestPayment: number; // Платёж по процентам
  remainingBalance: number; // Остаток после платежа
}

/**
 * Округление до 2 знаков после запятой
 */
function round(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Расчёт месячной процентной ставки
 */
function getMonthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

/**
 * Расчёт даты платежа
 */
function getPaymentDate(startDate: Date, monthsFromStart: number, firstPaymentDate?: Date): Date {
  if (monthsFromStart === 1 && firstPaymentDate) {
    return new Date(firstPaymentDate);
  }

  const baseDate = firstPaymentDate || startDate;
  const date = new Date(baseDate);

  // Добавляем месяцы
  const monthsToAdd = firstPaymentDate ? monthsFromStart - 1 : monthsFromStart;
  date.setMonth(date.getMonth() + monthsToAdd);

  return date;
}

/**
 * Расчёт аннуитетного платежа
 * Формула: A = K * S, где
 * K = (i * (1 + i)^n) / ((1 + i)^n - 1)
 * i - месячная ставка, n - количество месяцев, S - сумма кредита
 */
function calculateAnnuityPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  const K = (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
            (Math.pow(1 + monthlyRate, termMonths) - 1);

  return round(principal * K);
}

/**
 * Генерация графика платежей для аннуитетного кредита
 */
function generateAnnuitySchedule(params: CreditParams): PaymentScheduleItem[] {
  const { principal, annualRate, termMonths, startDate, firstPaymentDate } = params;
  const monthlyRate = getMonthlyRate(annualRate);
  const monthlyPayment = calculateAnnuityPayment(principal, monthlyRate, termMonths);

  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = round(remainingBalance * monthlyRate);
    let principalPayment = round(monthlyPayment - interestPayment);

    // Корректировка последнего платежа
    if (month === termMonths) {
      principalPayment = remainingBalance;
      const totalPayment = principalPayment + interestPayment;
      remainingBalance = 0;

      schedule.push({
        paymentNumber: month,
        paymentDate: getPaymentDate(startDate, month, firstPaymentDate),
        totalPayment: round(totalPayment),
        principalPayment: round(principalPayment),
        interestPayment: round(interestPayment),
        remainingBalance: 0,
      });
    } else {
      remainingBalance = round(remainingBalance - principalPayment);

      schedule.push({
        paymentNumber: month,
        paymentDate: getPaymentDate(startDate, month, firstPaymentDate),
        totalPayment: monthlyPayment,
        principalPayment: principalPayment,
        interestPayment: interestPayment,
        remainingBalance: remainingBalance,
      });
    }
  }

  return schedule;
}

/**
 * Генерация графика платежей для дифференцированного кредита
 */
function generateDifferentiatedSchedule(params: CreditParams): PaymentScheduleItem[] {
  const { principal, annualRate, termMonths, startDate, firstPaymentDate } = params;
  const monthlyRate = getMonthlyRate(annualRate);
  const principalPayment = round(principal / termMonths);

  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = round(remainingBalance * monthlyRate);
    let currentPrincipalPayment = principalPayment;

    // Корректировка последнего платежа
    if (month === termMonths) {
      currentPrincipalPayment = remainingBalance;
    }

    const totalPayment = round(currentPrincipalPayment + interestPayment);
    remainingBalance = round(remainingBalance - currentPrincipalPayment);

    // Убедимся что остаток не уходит в минус
    if (remainingBalance < 0.01) {
      remainingBalance = 0;
    }

    schedule.push({
      paymentNumber: month,
      paymentDate: getPaymentDate(startDate, month, firstPaymentDate),
      totalPayment: totalPayment,
      principalPayment: round(currentPrincipalPayment),
      interestPayment: round(interestPayment),
      remainingBalance: remainingBalance,
    });
  }

  return schedule;
}

/**
 * Главная функция генерации графика платежей
 */
export function generatePaymentSchedule(params: CreditParams): PaymentScheduleItem[] {
  if (params.paymentType === 'annuity') {
    return generateAnnuitySchedule(params);
  } else {
    return generateDifferentiatedSchedule(params);
  }
}

/**
 * Расчёт общей суммы выплат по кредиту
 */
export function calculateTotalPayment(schedule: PaymentScheduleItem[]): number {
  return round(schedule.reduce((sum, item) => sum + item.totalPayment, 0));
}

/**
 * Расчёт общей суммы процентов
 */
export function calculateTotalInterest(schedule: PaymentScheduleItem[]): number {
  return round(schedule.reduce((sum, item) => sum + item.interestPayment, 0));
}

/**
 * Пересчёт графика после досрочного погашения
 * @param originalSchedule - исходный график
 * @param earlyPaymentAmount - сумма досрочного погашения
 * @param earlyPaymentMonth - номер месяца досрочного погашения
 * @param params - параметры кредита
 * @returns новый график платежей
 */
export function recalculateScheduleAfterEarlyPayment(
  originalSchedule: PaymentScheduleItem[],
  earlyPaymentAmount: number,
  earlyPaymentMonth: number,
  params: CreditParams
): PaymentScheduleItem[] {
  // Находим остаток на момент досрочного погашения
  const paymentBeforeEarly = originalSchedule.find(p => p.paymentNumber === earlyPaymentMonth - 1);
  if (!paymentBeforeEarly) {
    throw new Error('Неверный номер месяца для досрочного погашения');
  }

  const newPrincipal = round(paymentBeforeEarly.remainingBalance - earlyPaymentAmount);

  // Если остаток меньше 1 рубля (копейки), считаем кредит погашенным
  if (newPrincipal < 1) {
    console.log('  - Остаток меньше 1, кредит считается погашенным');
    return [];
  }

  console.log('📊 [CreditCalculation] Пересчет графика после досрочного погашения:');
  console.log('  - Исходный срок кредита:', params.termMonths, 'мес.');
  console.log('  - Номер месяца досрочного погашения:', earlyPaymentMonth);
  console.log('  - Оплачено платежей:', earlyPaymentMonth - 1);
  console.log('  - Остаток основного долга до досрочки:', paymentBeforeEarly.remainingBalance);
  console.log('  - Сумма досрочного погашения:', earlyPaymentAmount);
  console.log('  - Новый остаток основного долга:', newPrincipal);

  // Рассчитываем новый график для оставшихся месяцев
  // ИСПРАВЛЕНО: количество оплаченных месяцев = earlyPaymentMonth - 1
  const remainingMonths = params.termMonths - (earlyPaymentMonth - 1);
  console.log('  - Оставшихся месяцев:', remainingMonths);

  const nextPaymentItem = originalSchedule.find(p => p.paymentNumber === earlyPaymentMonth);
  if (!nextPaymentItem) {
    throw new Error('Не найден следующий платеж для расчета даты');
  }

  const newParams: CreditParams = {
    ...params,
    principal: newPrincipal,
    termMonths: remainingMonths,
    startDate: nextPaymentItem.paymentDate,
  };

  const newSchedule = generatePaymentSchedule(newParams);

  console.log('  - Новый график создан:', newSchedule.length, 'платежей');

  // Корректируем номера платежей
  const correctedSchedule = newSchedule.map((item, index) => ({
    ...item,
    paymentNumber: item.paymentNumber + earlyPaymentMonth - 1,
  }));

  console.log('  - Номера платежей скорректированы: с', correctedSchedule[0]?.paymentNumber, 'по', correctedSchedule[correctedSchedule.length - 1]?.paymentNumber);
  console.log('✅ [CreditCalculation] Пересчет завершен успешно');

  return correctedSchedule;
}
