import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

interface AccountTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'cash' | 'card' | 'bank') => void;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  const options: Array<{
    type: 'cash' | 'card' | 'bank';
    icon: 'cash-outline' | 'card-outline' | 'business-outline';
    title: string;
    description: string;
  }> = [
    {
      type: 'cash',
      icon: 'cash-outline',
      title: t('accounts.types.cash'),
      description: t('accounts.cashDescription'),
    },
    {
      type: 'card',
      icon: 'card-outline',
      title: t('accounts.types.card'),
      description: t('accounts.cardDescription'),
    },
    {
      type: 'bank',
      icon: 'business-outline',
      title: t('accounts.types.bank'),
      description: t('accounts.bankDescription'),
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.container, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('accounts.selectAccountType')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {options.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[styles.option, { backgroundColor: colors.background }]}
              onPress={() => {
                onSelect(option.type);
                onClose();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={option.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
}); 