import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { Goal } from '../types/index';

interface EditGoalModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (goalId: string, data: {
    name: string;
    targetAmount: number;
    currency: string;
    icon?: string;
    description?: string;
  }) => Promise<void>;
}

const GOAL_ICONS = [
  'home-outline',
  'car-outline',
  'airplane-outline',
  'gift-outline',
  'laptop-outline',
  'phone-portrait-outline',
  'game-controller-outline',
  'bicycle-outline',
  'boat-outline',
  'camera-outline',
  'cart-outline',
  'cash-outline',
  'heart-outline',
  'paw-outline',
  'school-outline',
  'ticket-outline',
  'umbrella-outline',
  'wallet-outline',
  'watch-outline',
  'trophy-outline',
  'diamond-outline',
  'musical-note-outline',
  'fitness-outline',
  'library-outline',
  'ice-cream-outline',
  'pizza-outline',
  'wine-outline',
  'flower-outline',
  'star-outline',
  'rocket-outline',
] as const;

type GoalIcon = typeof GOAL_ICONS[number];

export const EditGoalModal: React.FC<EditGoalModalProps> = ({
  visible,
  goal,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<GoalIcon>(GOAL_ICONS[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: boolean}>({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (goal && visible) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setDescription(goal.description || '');
      setSelectedIcon((goal.icon as GoalIcon) || GOAL_ICONS[0]);
      setErrors({});
      setShowErrors(false);
    }
  }, [goal, visible]);

  const handleSave = async () => {
    if (!goal) return;

    const newErrors: {[key: string]: boolean} = {};

    if (!name.trim()) {
      newErrors.name = true;
    }

    const amount = parseFloat(targetAmount);
    if (!targetAmount || isNaN(amount) || amount <= 0) {
      newErrors.targetAmount = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    try {
      await onSave(goal.id, {
        name: name.trim(),
        targetAmount: amount,
        currency: defaultCurrency,
        icon: selectedIcon,
        description: description.trim() || undefined,
      });

      handleClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
  };

  const handleClose = () => {
    setErrors({});
    setShowErrors(false);
    onClose();
  };

  const renderIconPicker = () => (
    <Modal
      visible={showIconPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowIconPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.iconPickerModal, { backgroundColor: colors.card }]}>
          <View style={styles.iconPickerHeader}>
            <Text style={[styles.iconPickerTitle, { color: colors.text }]}>
              {t('goals.selectIcon')}
            </Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={GOAL_ICONS}
            numColumns={4}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconPickerItem,
                  {
                    backgroundColor: colors.background,
                    borderColor: selectedIcon === item ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  setSelectedIcon(item);
                  setShowIconPicker(false);
                }}
              >
                <Ionicons
                  name={item as any}
                  size={28}
                  color={selectedIcon === item ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.iconGrid}
          />
        </View>
      </View>
    </Modal>
  );

  if (!goal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('common.edit')} {t('goals.goal')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name={selectedIcon as any} size={32} color="#fff" />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.iconSelector, { backgroundColor: colors.background }]}
              onPress={() => setShowIconPicker(true)}
            >
              <Text style={[styles.iconSelectorText, { color: colors.text }]}>
                {t('goals.selectIcon')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('goals.goalName')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: showErrors && errors.name ? '#FF4444' : colors.border,
                  }
                ]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (showErrors && errors.name && text.trim()) {
                    setErrors(prev => ({ ...prev, name: false }));
                  }
                }}
                placeholder={t('goals.goalNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
              {showErrors && errors.name && (
                <Text style={styles.errorText}>
                  {t('goals.goalNameRequired')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('goals.targetAmount')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: showErrors && errors.targetAmount ? '#FF4444' : colors.border,
                  }
                ]}
                value={targetAmount}
                onChangeText={(text) => {
                  setTargetAmount(text);
                  if (showErrors && errors.targetAmount && text && parseFloat(text) > 0) {
                    setErrors(prev => ({ ...prev, targetAmount: false }));
                  }
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              {showErrors && errors.targetAmount && (
                <Text style={styles.errorText}>
                  {t('goals.targetAmountRequired')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('goals.description')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('goals.descriptionPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {renderIconPicker()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: '60%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  iconSelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPickerModal: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  iconPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconGrid: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconPickerItem: {
    width: 60,
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
});