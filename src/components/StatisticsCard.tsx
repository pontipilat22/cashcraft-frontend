import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataContext';

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

interface StatisticsCardProps {
  onPeriodPress?: () => void;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ onPeriodPress }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const { getStatistics, transactions } = useData();
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [stats, setStats] = useState({ income: 0, expense: 0 });

  useEffect(() => {
    updateDatesForPeriod(selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    const newStats = getStatistics(startDate, endDate);
    setStats(newStats);
  }, [startDate, endDate, getStatistics, transactions]);

  const updateDatesForPeriod = (period: PeriodType) => {
    const now = new Date();
    let start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Понедельник = 0
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        // Для custom используем текущие даты
        return;
    }
    
    setStartDate(start);
    setEndDate(now);
  };

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'today':
        return t('statistics.today') || 'Сегодня';
      case 'week':
        return t('statistics.thisWeek') || 'Эта неделя';
      case 'month':
        return t('statistics.thisMonth') || 'Этот месяц';
      case 'year':
        return t('statistics.thisYear') || 'Этот год';
      case 'custom':
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
  };

  const periods: Array<{ type: PeriodType; label: string; icon: any }> = [
    { type: 'today', label: t('statistics.today') || 'Сегодня', icon: 'today' },
    { type: 'week', label: t('statistics.thisWeek') || 'Эта неделя', icon: 'calendar-outline' },
    { type: 'month', label: t('statistics.thisMonth') || 'Этот месяц', icon: 'calendar' },
    { type: 'year', label: t('statistics.thisYear') || 'Этот год', icon: 'calendar-outline' },
  ];

  return (
    <>
      <View style={[styles.statsCard, { 
        backgroundColor: colors.statsBg,
        shadowColor: isDark ? '#000' : '#b0b0b0',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: isDark ? 0.7 : 0.4,
        shadowRadius: 20,
        elevation: 15,
      }]}>
        <TouchableOpacity 
          style={styles.periodSelector}
          onPress={() => setShowPeriodModal(true)}
        >
          <Text style={styles.statsTitle}>{t('accounts.statsForPeriod')}</Text>
          <View style={styles.periodButton}>
            <Text style={styles.periodText}>{getPeriodText()}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-down" size={24} color="#fff" />
            <Text style={styles.statLabel}>{t('accounts.expenses')}</Text>
            <Text style={styles.statAmount}>{formatAmount(stats.expense)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="arrow-up" size={24} color="#fff" />
            <Text style={styles.statLabel}>{t('accounts.income')}</Text>
            <Text style={styles.statAmount}>{formatAmount(stats.income)}</Text>
          </View>
        </View>
      </View>

      <Modal
        visible={showPeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('statistics.selectPeriod') || 'Выберите период'}
              </Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {periods.map((period) => (
              <TouchableOpacity
                key={period.type}
                style={[
                  styles.periodOption,
                  selectedPeriod === period.type && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setSelectedPeriod(period.type);
                  setShowPeriodModal(false);
                }}
              >
                <View style={styles.periodOptionContent}>
                  <Ionicons name={period.icon} size={24} color={colors.text} />
                  <Text style={[styles.periodOptionText, { color: colors.text }]}>
                    {period.label}
                  </Text>
                </View>
                {selectedPeriod === period.type && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  periodText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  statAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  periodOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodOptionText: {
    fontSize: 16,
  },
}); 