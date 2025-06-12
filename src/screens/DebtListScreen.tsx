import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { Debt } from '../types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DebtActionsModal } from '../components/DebtActionsModal';
import { useFocusEffect } from '@react-navigation/native';

interface DebtListScreenProps {
  route: {
    params: {
      type: 'owed_to_me' | 'owed_by_me';
    };
  };
  navigation: any;
}

export const DebtListScreen: React.FC<DebtListScreenProps> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const { t } = useLocalization();
  const { type } = route.params;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);

  // Загружаем долги при фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      loadDebts();
    }, [type])
  );

  const loadDebts = async () => {
    setLoading(true);
    const allDebts = await LocalDatabaseService.getDebts();
    setDebts(allDebts.filter((d: Debt) => d.type === type));
    setLoading(false);
  };

  const handleLongPress = (debt: Debt) => {
    setSelectedDebt(debt);
    setActionsModalVisible(true);
  };

  const renderDebt = ({ item }: { item: Debt }) => {
    return (
      <TouchableOpacity 
        style={[styles.debtItem, { backgroundColor: colors.card }]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.debtInfo}>
          <View style={styles.debtDetails}>
            <Text style={[styles.debtName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.debtDate, { color: colors.textSecondary }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }) : ''}
            </Text>
          </View>
          <Text style={[styles.debtAmount, { color: colors.primary }]}>
            {formatAmount(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          {type === 'owed_to_me' ? t('accounts.owedToMe') : t('accounts.owedByMe')}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t(type === 'owed_to_me' ? 'debts.owedToMeDescription' : 'debts.owedByMeDescription')}
      </Text>

      {debts.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t(type === 'owed_to_me' ? 'debts.owedToMeEmpty' : 'debts.owedByMeEmpty')}
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
        debt={selectedDebt}
        onClose={() => setActionsModalVisible(false)}
        onUpdate={loadDebts}
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
  debtDetails: {
    flex: 1,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '500',
  },
  debtDate: {
    fontSize: 12,
    marginTop: 4,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
  },
}); 