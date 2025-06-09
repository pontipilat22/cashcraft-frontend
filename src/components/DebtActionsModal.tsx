import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { DatabaseService } from '../services/database';
import { Debt } from '../types';
import { DebtOperationModal } from './DebtOperationModal';
import { EditDebtModal } from './EditDebtModal';

interface DebtActionsModalProps {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const DebtActionsModal: React.FC<DebtActionsModalProps> = ({
  visible,
  debt,
  onClose,
  onUpdate,
}) => {
  const { colors } = useTheme();
  const [showDebtOperationModal, setShowDebtOperationModal] = useState(false);
  const [debtOperationType, setDebtOperationType] = useState<'give' | 'return' | 'borrow' | 'payback' | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!debt) return null;

  const handlePayOff = () => {
    onClose();
    setDebtOperationType(debt.type === 'owed' ? 'return' : 'payback');
    setShowDebtOperationModal(true);
  };

  const handleEdit = () => {
    onClose();
    setShowEditModal(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить долг',
      `Вы уверены, что хотите удалить долг "${debt.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteDebt(debt.id);
              onUpdate();
              onClose();
            } catch (error) {
              console.error('Error deleting debt:', error);
            }
          },
        },
      ]
    );
  };

  const actions = [
    {
      icon: 'checkmark-circle',
      label: debt.type === 'owed' ? 'Получить долг' : 'Вернуть долг',
      onPress: handlePayOff,
      color: '#4CAF50',
    },
    {
      icon: 'pencil',
      label: 'Редактировать',
      onPress: handleEdit,
      color: colors.primary,
    },
    {
      icon: 'trash',
      label: 'Удалить',
      onPress: handleDelete,
      color: '#FF5252',
    },
  ];

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={[styles.content, { backgroundColor: colors.card }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
              <Text style={[styles.debtAmount, { color: debt.type === 'owed' ? '#4CAF50' : '#FF5252' }]}>
                {debt.type === 'owed' ? '+' : '-'}{debt.amount.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
            
            <View style={styles.actions}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionItem}
                  onPress={action.onPress}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <DebtOperationModal
        visible={showDebtOperationModal}
        operationType={debtOperationType}
        onClose={() => {
          setShowDebtOperationModal(false);
          setDebtOperationType(null);
          onUpdate();
        }}
        onOperationComplete={onUpdate}
      />

      <EditDebtModal
        visible={showEditModal}
        debt={debt}
        mode='edit'
        onClose={() => {
          setShowEditModal(false);
          onUpdate();
        }}
        onSave={onUpdate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  debtName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  debtAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    paddingTop: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
  },
}); 