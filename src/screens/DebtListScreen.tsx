import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DatabaseService } from '../services/database';
import { Debt } from '../types';
import Ionicons from '@expo/vector-icons/Ionicons';

interface DebtListScreenProps {
  route: {
    params: {
      type: 'owe' | 'owed';
    };
  };
  navigation: any;
}

export const DebtListScreen: React.FC<DebtListScreenProps> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { type } = route.params;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    setLoading(true);
    const allDebts = await DatabaseService.getDebts();
    setDebts(allDebts.filter(d => d.type === type));
    setLoading(false);
  };

  const renderDebt = ({ item }: { item: Debt }) => (
    <View style={[styles.debtItem, { backgroundColor: colors.card }]}>
      <View style={styles.debtInfo}>
        <Text style={[styles.debtName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.debtAmount, { color: colors.primary }]}>
          {item.amount.toLocaleString('ru-RU')} ₽
        </Text>
      </View>
    </View>
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