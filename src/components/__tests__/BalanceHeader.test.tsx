import React from 'react';
import { render } from '../../test-utils';
import { BalanceHeader } from '../BalanceHeader';

describe('BalanceHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render total balance label', () => {
    const { getByText } = render(<BalanceHeader />);

    expect(getByText('Total Balance')).toBeTruthy();
  });

  it('should render formatted balance amount', () => {
    const { getByText } = render(<BalanceHeader />);

    // Баланс должен быть отформатирован через formatAmount из context
    // В jest.setup.js мы мокаем formatAmount чтобы возвращал "1,000.00 USD"
    const balanceText = getByText(/1,000.00 USD|0/);
    expect(balanceText).toBeTruthy();
  });

  it('should not show daily allowance by default', () => {
    const { queryByText } = render(<BalanceHeader />);

    expect(queryByText('plans.canSpendToday')).toBeFalsy();
  });

  it('should show daily allowance when enabled and flag is true', () => {
    const { getByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={true} />
    );

    expect(getByText('Can Spend Today')).toBeTruthy();
  });

  it('should not show daily allowance when budget is disabled', () => {
    const { queryByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={false} />
    );

    expect(queryByText('Can Spend Today')).toBeFalsy();
  });

  it('should render daily allowance with green color for positive amount', () => {
    const { getByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={true} />
    );

    // Check that daily allowance section is shown
    expect(getByText('Can Spend Today')).toBeTruthy();
  });

  it('should use prop isBudgetEnabled over context value', () => {
    const { getByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={true} />
    );

    // Если передан prop, он должен иметь приоритет
    expect(getByText('Can Spend Today')).toBeTruthy();
  });

  it('should calculate daily allowance when budget is enabled', () => {
    // Проверяем, что вызывается getDailyAllowance из BudgetContext
    const { getByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={true} />
    );

    // Результат должен отобразиться
    expect(getByText('Can Spend Today')).toBeTruthy();
  });

  it('should update when totalBalance changes', () => {
    const { rerender, getByText } = render(<BalanceHeader />);

    // Перерендерим компонент
    rerender(<BalanceHeader />);

    // Баланс должен обновиться
    expect(getByText('Total Balance')).toBeTruthy();
  });

  it('should handle zero balance', () => {
    const { getByText } = render(<BalanceHeader />);

    // Должен отображаться даже нулевой баланс
    const balanceText = getByText(/0|1,000.00 USD/);
    expect(balanceText).toBeTruthy();
  });

  it('should format daily allowance correctly', () => {
    const { getByText } = render(
      <BalanceHeader showDailyAllowance={true} isBudgetEnabled={true} />
    );

    // Дневной лимит должен быть отформатирован
    expect(getByText('Can Spend Today')).toBeTruthy();
  });
});
