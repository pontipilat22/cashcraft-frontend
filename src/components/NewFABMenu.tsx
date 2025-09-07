import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NewFABMenuProps {
  onIncomePress: () => void;
  onExpensePress: () => void;
  onTransferPress: () => void;
  onDebtPress: () => void;
  onAddAccountPress: () => void;
  onAddSavingsPress?: () => void;
  onAddCreditPress?: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export const NewFABMenu: React.FC<NewFABMenuProps> = ({
  onIncomePress,
  onExpensePress,
  onTransferPress,
  onDebtPress,
  onAddAccountPress,
  onAddSavingsPress,
  onAddCreditPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuPress = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleItemPress = (action: () => void) => {
    setIsOpen(false);
    setTimeout(() => {
      action();
    }, 150);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'income',
      title: t('transactions.income'),
      icon: 'add-circle',
      color: colors.primary,
      onPress: () => handleItemPress(onIncomePress),
    },
    {
      id: 'expense',
      title: t('transactions.expense'),
      icon: 'remove-circle',
      color: colors.primary,
      onPress: () => handleItemPress(onExpensePress),
    },
    {
      id: 'transfer',
      title: t('transactions.transfer'),
      icon: 'swap-horizontal',
      color: colors.primary,
      onPress: () => handleItemPress(onTransferPress),
    },
    {
      id: 'debt',
      title: t('debts.debt'),
      icon: 'people',
      color: colors.primary,
      onPress: () => handleItemPress(onDebtPress),
    },
    {
      id: 'account',
      title: t('accounts.addAccount'),
      icon: 'wallet',
      color: colors.primary,
      onPress: () => handleItemPress(onAddAccountPress),
    },
  ];

  // Добавляем опциональные элементы
  if (onAddSavingsPress) {
    menuItems.push({
      id: 'savings',
      title: t('accounts.addGoal'),
      icon: 'flag',
      color: colors.primary,
      onPress: () => handleItemPress(onAddSavingsPress),
    });
  }

  if (onAddCreditPress) {
    menuItems.push({
      id: 'credit',
      title: t('accounts.addCredit'),
      icon: 'card',
      color: colors.primary,
      onPress: () => handleItemPress(onAddCreditPress),
    });
  }


  const styles = StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 20,
      paddingHorizontal: 0,
      paddingBottom: 30,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    menuList: {
      paddingHorizontal: 0,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
    },
    closeButton: {
      position: 'absolute',
      top: 15,
      right: 15,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={handleMenuPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                <Text style={styles.menuTitle}>
                  {t('common.quickActions')}
                </Text>

                <View style={styles.menuList}>
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.menuItem,
                        index === menuItems.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={item.onPress}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.menuItemIcon, { backgroundColor: item.color }]}>
                        <Ionicons 
                          name={item.icon} 
                          size={20} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <Text style={styles.menuItemText}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};
