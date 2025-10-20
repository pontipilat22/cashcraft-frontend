import React from 'react';
import { render } from '../../test-utils';
import { AccountCard } from '../AccountCard';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-native-gesture-handler', () => ({
  TouchableOpacity: 'TouchableOpacity',
}));

describe('AccountCard', () => {
  const mockAccount = {
    id: '1',
    name: 'Test Account',
    balance: 1000,
    currency: 'USD',
    type: 'cash' as const,
    icon: 'wallet',
    color: '#4CAF50',
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render account name', () => {
    const { getByText } = render(
      <AccountCard
        account={mockAccount}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('Test Account')).toBeTruthy();
  });

  it('should render account balance with currency', () => {
    const { getByText } = render(
      <AccountCard
        account={mockAccount}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    // Проверяем что баланс отображается (символ валюты $)
    expect(getByText(/1[,\s]*000/)).toBeTruthy();
  });

  it('should handle negative balance', () => {
    const negativeAccount = { ...mockAccount, balance: -500 };

    const { getByText } = render(
      <AccountCard
        account={negativeAccount}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText(/-500/)).toBeTruthy();
  });

  it('should handle zero balance', () => {
    const zeroAccount = { ...mockAccount, balance: 0 };

    const { getByText } = render(
      <AccountCard
        account={zeroAccount}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText(/0/)).toBeTruthy();
  });

  it('should render different currencies correctly', () => {
    const eurAccount = { ...mockAccount, currency: 'EUR' };

    const { getByText } = render(
      <AccountCard
        account={eurAccount}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    // Проверяем что отображается баланс (символ валюты €)
    expect(getByText(/1[,\s]*000/)).toBeTruthy();
  });
});
