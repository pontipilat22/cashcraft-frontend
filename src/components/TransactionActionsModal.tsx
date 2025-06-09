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
import { Transaction, Category } from '../types';

interface TransactionActionsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  category?: Category;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TransactionActionsModal: React.FC<TransactionActionsModalProps> = ({
  visible,
  transaction,
  category,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();

  if (!transaction) return null;

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  const isIncome = transaction.type === 'income';
  const amount = `${isIncome ? '+' : '-'}${transaction.amount.toLocaleString('ru-RU')} ₽`;
  
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
          {/* Заголовок с информацией о транзакции */}
          <View style={styles.header}>
            <View style={styles.transactionInfo}>
              {category && (
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={24} color={category.color} />
                </View>
              )}
              <View style={styles.transactionDetails}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {category?.name || (isIncome ? 'Доход' : 'Расход')}
                </Text>
                {Boolean(transaction.description) && (
                  <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.amount, { color: isIncome ? '#4CAF50' : colors.text }]}>
                {amount}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]}></View>

          {/* Действия */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEdit}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  Редактировать
                </Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  Изменить детали транзакции
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F44336' + '20' }]}>
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  Удалить
                </Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  Удалить транзакцию безвозвратно
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
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
  header: {
    marginBottom: 16,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  actions: {
    // gap не поддерживается, используем marginBottom для элементов
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
  },
}); 