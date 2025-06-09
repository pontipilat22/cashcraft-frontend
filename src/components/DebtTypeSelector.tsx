import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface DebtTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'give' | 'return' | 'borrow' | 'payback') => void;
}

export const DebtTypeSelector: React.FC<DebtTypeSelectorProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { colors } = useTheme();
  const [selectedSection, setSelectedSection] = useState<'give' | 'borrow'>('give');

  const handleSelect = (operation: 'give' | 'return') => {
    if (selectedSection === 'give') {
      onSelect(operation === 'give' ? 'give' : 'return');
    } else {
      onSelect(operation === 'give' ? 'borrow' : 'payback');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, { backgroundColor: colors.card }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Выберите операцию
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.sectionSelector, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.sectionButton,
                    selectedSection === 'give' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedSection('give')}
                >
                  <Text
                    style={[
                      styles.sectionButtonText,
                      { color: selectedSection === 'give' ? '#fff' : colors.text },
                    ]}
                  >
                    Я даю
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sectionButton,
                    selectedSection === 'borrow' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedSection('borrow')}
                >
                  <Text
                    style={[
                      styles.sectionButtonText,
                      { color: selectedSection === 'borrow' ? '#fff' : colors.text },
                    ]}
                  >
                    Мне дают
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.options}>
                {selectedSection === 'give' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.option, { backgroundColor: colors.background }]}
                      onPress={() => handleSelect('give')}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: '#2196F320' }]}>
                        <Ionicons name="arrow-up-circle" size={32} color="#2196F3" />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                          Дать в долг
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          Дать деньги в долг кому-то
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.option, { backgroundColor: colors.background }]}
                      onPress={() => handleSelect('return')}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: '#4CAF5020' }]}>
                        <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                          Получить долг
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          Получить возврат долга
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.option, { backgroundColor: colors.background }]}
                      onPress={() => handleSelect('give')}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: '#9C27B020' }]}>
                        <Ionicons name="arrow-down-circle" size={32} color="#9C27B0" />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                          Взять в долг
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          Взять деньги в долг у кого-то
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.option, { backgroundColor: colors.background }]}
                      onPress={() => handleSelect('return')}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: '#FF525220' }]}>
                        <Ionicons name="checkmark-circle" size={32} color="#FF5252" />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                          Вернуть долг
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          Вернуть долг кому-то
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
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
  sectionSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  sectionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  sectionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
}); 