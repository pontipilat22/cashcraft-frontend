import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

interface DebtActionsModalProps {
  visible: boolean;
  debtName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPartialPay: () => void;
}

export const DebtActionsModal: React.FC<DebtActionsModalProps> = ({
  visible,
  debtName,
  onClose,
  onEdit,
  onDelete,
  onPartialPay,
}) => {
  const { colors } = useTheme();

  const actions = [
    {
      icon: 'create-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Редактировать',
      color: colors.primary,
      onPress: onEdit,
    },
    {
      icon: 'cash-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Частичное погашение',
      color: colors.primary,
      onPress: onPartialPay,
    },
    {
      icon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Удалить',
      color: '#f44336',
      onPress: onDelete,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{debtName}</Text>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, index < actions.length - 1 && styles.actionButtonMargin]}
              onPress={() => {
                action.onPress();
                onClose();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: action.color + '22' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.background }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  actionButtonMargin: {
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 