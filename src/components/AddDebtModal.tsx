import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DatabaseService } from '../services/database';

interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({ visible, onClose, onSave }) => {
  const { colors } = useTheme();
  const [type, setType] = useState<'owe' | 'owed'>('owed');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isIncludedInTotal, setIsIncludedInTotal] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !amount) return;
    setLoading(true);
    await DatabaseService.createDebt({
      type,
      name: name.trim(),
      amount: parseFloat(amount),
      isIncludedInTotal,
    });
    setLoading(false);
    setName('');
    setAmount('');
    setType('owed');
    setIsIncludedInTotal(true);
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: colors.card }]}> 
              <Text style={[styles.title, { color: colors.text }]}>Добавить долг</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'owed' && { backgroundColor: colors.primary + '22' }]}
                  onPress={() => setType('owed')}
                >
                  <Text style={{ color: colors.text }}>Мне должны</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'owe' && { backgroundColor: colors.primary + '22' }]}
                  onPress={() => setType('owe')}
                >
                  <Text style={{ color: colors.text }}>Я должен</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder={type === 'owed' ? 'Кто должен?' : 'Кому должен?'}
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Сумма"
                placeholderTextColor={colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <View style={styles.switchRow}>
                <Text style={{ color: colors.text }}>Учитывать в общем балансе</Text>
                <Switch
                  value={isIncludedInTotal}
                  onValueChange={setIsIncludedInTotal}
                  trackColor={{ false: '#767577', true: colors.primary }}
                />
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Сохранить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.border }]} onPress={onClose}>
                  <Text style={{ color: colors.text }}>Отмена</Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
}); 