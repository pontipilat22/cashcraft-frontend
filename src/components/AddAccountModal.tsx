import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AccountType, AccountTypeLabels } from '../types';

interface AddAccountModalProps {
  visible: boolean;
  accountType: AccountType;
  onClose: () => void;
  onSave: (data: { 
    name: string; 
    balance: number; 
    cardNumber?: string;
    isDefault?: boolean;
    isIncludedInTotal?: boolean;
    icon?: string;
    targetAmount?: number;
    interestRate?: number;
    openDate?: string;
    interestDay?: number;
  }) => void;
}

const SAVINGS_ICONS = [
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
  'gift-outline',
  'heart-outline',
  'paw-outline',
  'school-outline',
  'ticket-outline',
  'umbrella-outline',
  'wallet-outline',
  'watch-outline',
] as const;

type SavingsIcon = typeof SAVINGS_ICONS[number];

const ACCOUNT_TYPES: AccountType[] = ['cash', 'card', 'savings', 'debt', 'credit'];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  accountType,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState<SavingsIcon>(SAVINGS_ICONS[0]);
  const [targetAmount, setTargetAmount] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [interestDay, setInterestDay] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      balance: parseFloat(balance) || 0,
      cardNumber: cardNumber.trim() || undefined,
      isDefault: accountType !== 'savings' ? isDefault : false,
      isIncludedInTotal,
      icon: accountType === 'savings' ? selectedIcon : undefined,
      targetAmount: accountType === 'savings' ? parseFloat(targetAmount) || 0 : undefined,
      interestRate: accountType === 'bank' ? parseFloat(interestRate) || undefined : undefined,
      openDate: accountType === 'bank' ? openDate || undefined : undefined,
      interestDay: accountType === 'bank' ? parseInt(interestDay) || undefined : undefined,
    });

    // Очищаем форму
    setName('');
    setBalance('');
    setCardNumber('');
    setIsDefault(false);
    setIsIncludedInTotal(true);
    setSelectedIcon(SAVINGS_ICONS[0]);
    setTargetAmount('');
    setInterestRate('');
    setOpenDate('');
    setInterestDay('');
  };

  const getIcon = () => {
    if (accountType === 'savings' && selectedIcon) {
      return selectedIcon;
    }
    switch (accountType) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'bank':
        return 'business-outline';
      case 'savings':
        return 'trending-up-outline';
      case 'debt':
        return 'arrow-down-circle-outline';
      case 'credit':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Добавить счет
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name={getIcon()} size={32} color="#fff" />
              </View>
            </View>

            {accountType === 'savings' && (
              <TouchableOpacity
                style={[styles.iconSelector, { backgroundColor: colors.background }]}
                onPress={() => setShowIconPicker(true)}
              >
                <Text style={[styles.iconSelectorText, { color: colors.text }]}>
                  Выбрать иконку
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Название</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder={`Название ${AccountTypeLabels[accountType].toLowerCase()}`}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Баланс</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={balance}
                onChangeText={setBalance}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {accountType === 'savings' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Цель накопления</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}

            {accountType === 'card' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Номер карты</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="XXXX XXXX XXXX XXXX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
            )}

            {accountType !== 'savings' && (
              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Счет по умолчанию</Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
            )}

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Учитывать в общем балансе</Text>
              <Switch
                value={isIncludedInTotal}
                onValueChange={setIsIncludedInTotal}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>

            {accountType === 'bank' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Процентная ставка в год (%)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    placeholder="Например: 7.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Дата открытия счета</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={openDate}
                    onChangeText={setOpenDate}
                    placeholder="ДД.ММ.ГГГГ"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Число начисления процентов</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={interestDay}
                    onChangeText={setInterestDay}
                    placeholder="Например: 15"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showIconPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIconPicker(false)}
      >
        <View style={[styles.iconPickerContainer, { backgroundColor: colors.card }]}>
          <View style={styles.iconPickerHeader}>
            <Text style={[styles.iconPickerTitle, { color: colors.text }]}>
              Выберите иконку
            </Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SAVINGS_ICONS}
            numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconItem,
                  { backgroundColor: colors.background },
                  selectedIcon === item && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setSelectedIcon(item);
                  setShowIconPicker(false);
                }}
              >
                <Ionicons name={item} size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            keyExtractor={item => item}
            contentContainerStyle={styles.iconGrid}
          />
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  iconSelectorText: {
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconPickerContainer: {
    flex: 1,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconGrid: {
    padding: 16,
  },
  iconItem: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
}); 