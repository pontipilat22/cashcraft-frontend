import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { validateNumericInput } from '../utils/numberInput';
import { modalStyles } from '../styles/modalStyles';
import { ModalWrapper } from './common/ModalWrapper';
import { ModalFooter } from './common/ModalFooter';
import { InputField } from './common/InputField';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
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

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
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

  const handleSave = async () => {
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
      await onSave({
        name: name.trim(),
        targetAmount: amount,
        currency: defaultCurrency,
        icon: selectedIcon,
        description: description.trim() || undefined,
      });

      // Сбрасываем форму
      setName('');
      setTargetAmount('');
      setDescription('');
      setSelectedIcon(GOAL_ICONS[0]);
      setErrors({});
      setShowErrors(false);

      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    }
  };

  const handleClose = () => {
    // Сбрасываем форму при закрытии
    setName('');
    setTargetAmount('');
    setDescription('');
    setSelectedIcon(GOAL_ICONS[0]);
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

  return (
    <ModalWrapper
      visible={visible}
      onClose={handleClose}
      title={t('goals.addGoal') || 'Добавить цель'}
      showScrollView={false}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={modalStyles.iconContainer}>
          <View style={[modalStyles.iconCircleLarge, { backgroundColor: colors.primary }]}>
            <Ionicons name={selectedIcon as any} size={40} color="#fff" />
          </View>
        </View>

        {/* Icon Selector */}
        <TouchableOpacity
          style={[styles.iconSelector, { backgroundColor: colors.background }]}
          onPress={() => setShowIconPicker(true)}
        >
          <Text style={[styles.iconSelectorText, { color: colors.text }]}>
            {t('goals.selectIcon')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Goal Name */}
        <InputField
          label={t('goals.goalName')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (showErrors && errors.name && text.trim()) {
              setErrors(prev => ({ ...prev, name: false }));
            }
          }}
          placeholder={t('goals.goalNamePlaceholder')}
          showError={showErrors && errors.name}
          errorMessage={t('goals.goalNameRequired')}
        />

        {/* Target Amount */}
        <InputField
          label={t('goals.targetAmount')}
          value={targetAmount}
          onChangeText={(text) => {
            const validated = validateNumericInput(text);
            setTargetAmount(validated);
            if (showErrors && errors.targetAmount && validated && parseFloat(validated) > 0) {
              setErrors(prev => ({ ...prev, targetAmount: false }));
            }
          }}
          placeholder="0"
          keyboardType="numeric"
          showError={showErrors && errors.targetAmount}
          errorMessage={t('goals.targetAmountRequired')}
        />

        {/* Description */}
        <View style={modalStyles.inputContainer}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {t('goals.description')} ({t('common.optional')})
          </Text>
          <TextInput
            style={[
              modalStyles.input,
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

      {/* Footer */}
      <ModalFooter
        onCancel={handleClose}
        onSave={handleSave}
      />

      {/* Icon Picker Modal */}
      {renderIconPicker()}
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
