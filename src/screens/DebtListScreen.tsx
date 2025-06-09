import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DatabaseService } from '../services/database';
import { Debt } from '../types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DebtActionsModal } from '../components/DebtActionsModal';
import { EditDebtModal } from '../components/EditDebtModal';

interface DebtListScreenProps {
  route: {
    params: {
      type: 'owe' | 'owed';
      onUpdate?: () => void;
    };
  };
  navigation: any;
}

export const DebtListScreen: React.FC<DebtListScreenProps> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { type, onUpdate } = route.params;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'edit' | 'partial'>('edit');

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    setLoading(true);
    const allDebts = await DatabaseService.getDebts();
    setDebts(allDebts.filter(d => d.type === type));
    setLoading(false);
    if (onUpdate) onUpdate();
  };

  const handleLongPress = (debt: Debt) => {
    setSelectedDebt(debt);
    setActionsModalVisible(true);
  };

  const handleEdit = () => {
    setEditMode('edit');
    setEditModalVisible(true);
  };

  const handlePartialPay = () => {
    setEditMode('partial');
    setEditModalVisible(true);
  };

  const handleDelete = () => {
    if (!selectedDebt) return;
    
    Alert.alert(
      'Удалить долг',
      `Вы уверены, что хотите удалить долг "${selectedDebt.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deleteDebt(selectedDebt.id);
            loadDebts();
          },
        },
      ]
    );
  };

  const renderDebt = ({ item }: { item: Debt }) => (
    <TouchableOpacity 
      style={[styles.debtItem, { backgroundColor: colors.card }]}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={styles.debtInfo}>
        <Text style={[styles.debtName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.debtAmount, { color: colors.primary }]}>
          {item.amount.toLocaleString('ru-RU')} ₽
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {type === 'owed' ? 'Мне должны' : 'Я должен'}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {type === 'owed' 
          ? 'Список людей, которые должны вам деньги' 
          : 'Список людей, которым вы должны деньги'}
      </Text>

      {debts.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {type === 'owed' ? 'Никто вам не должен' : 'Вы никому не должны'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={debts}
          renderItem={renderDebt}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <DebtActionsModal
        visible={actionsModalVisible}
        debtName={selectedDebt?.name || ''}
        onClose={() => setActionsModalVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPartialPay={handlePartialPay}
      />

      <EditDebtModal
        visible={editModalVisible}
        debt={selectedDebt}
        mode={editMode}
        onClose={() => setEditModalVisible(false)}
        onSave={() => {
          setEditModalVisible(false);
          loadDebts();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  description: {
    padding: 16,
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  debtItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  debtInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtName: {
    fontSize: 16,
    fontWeight: '500',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
  },
}); 