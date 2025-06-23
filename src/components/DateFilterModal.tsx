import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import Ionicons from '@expo/vector-icons/Ionicons';

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFilter: (filter: 'week' | 'month' | 'custom') => void;
  currentFilter: string;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({ visible, onClose, onSelectFilter, currentFilter }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  const filters = [
    { key: 'week', label: t('transactions.weekTransactions'), icon: 'calendar' },
    { key: 'month', label: t('transactions.monthTransactions'), icon: 'calendar-outline' },
    { key: 'custom', label: t('transactions.customPeriod'), icon: 'options-outline' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPressOut={onClose}>
        <SafeAreaView>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('transactions.selectPeriod')}</Text>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={styles.filterOption}
                onPress={() => onSelectFilter(filter.key as 'week' | 'month' | 'custom')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={filter.icon as any} size={22} color={colors.textSecondary} />
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{filter.label}</Text>
                </View>
                {currentFilter === filter.key && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.background }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  filterOptionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 