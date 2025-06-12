import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Transaction } from '../types';
import { CURRENCIES } from '../config/currencies';

interface SectionHeaderProps {
  title: string;
  data: Transaction[];
}

const SectionHeaderComponent: React.FC<SectionHeaderProps> = ({ title, data }) => {
  const { colors } = useTheme();
  const { defaultCurrency } = useCurrency();
  const currencySymbol = CURRENCIES[defaultCurrency]?.symbol || '$';
  
  const total = React.useMemo(() => {
    return data.reduce((sum: number, t: Transaction) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
  }, [data]);
  
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <Text style={[styles.sectionAmount, { color: colors.textSecondary }]}>
        {total > 0 ? '+' : ''}{currencySymbol}{Math.abs(total).toLocaleString()}
      </Text>
    </View>
  );
};

export const SectionHeader = React.memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 