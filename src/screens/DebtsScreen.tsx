import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { Debt } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { AddDebtModal } from '../components/AddDebtModal';

export const DebtsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { formatAmount } = useCurrency();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [totalOwedByMe, setTotalOwedByMe] = useState(0);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      const loadedDebts = await LocalDatabaseService.getDebts();
      setDebts(loadedDebts);
      
      // Рассчитываем итоги
      const owedToMe = loadedDebts
        .filter(d => d.type === 'owed_to_me' && d.isIncludedInTotal !== false)
        .reduce((sum, d) => sum + d.amount, 0);
      
      const owedByMe = loadedDebts
        .filter(d => d.type === 'owed_by_me' && d.isIncludedInTotal !== false)
        .reduce((sum, d) => sum + d.amount, 0);
      
      setTotalOwedToMe(owedToMe);
      setTotalOwedByMe(owedByMe);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDebt = async (debtData: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingDebt) {
        await LocalDatabaseService.updateDebt(editingDebt.id, debtData);
      } else {
        await LocalDatabaseService.createDebt(debtData);
      }
      await loadDebts();
      setShowAddModal(false);
      setEditingDebt(null);
    } catch (error) {
      console.error('Error saving debt:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить долг');
    }
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      t('debts.deleteTitle'),
      t('debts.deleteConfirm', { name: debt.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('debts.deleteTitle'),
          style: 'destructive',
          onPress: async () => {
            try {
              await LocalDatabaseService.deleteDebt(debt.id);
              await loadDebts();
            } catch (error) {
              console.error('Error deleting debt:', error);
              Alert.alert(t('debts.deleteError'));
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  const renderDebtItem = ({ item }: { item: Debt }) => {
    const isOwedToMe = item.type === 'owed_to_me';
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
    
    return (
      <TouchableOpacity
        style={[styles.debtItem, { backgroundColor: colors.card }]}
        onPress={() => {
          setEditingDebt(item);
          setShowAddModal(true);
        }}
        onLongPress={() => handleDeleteDebt(item)}
      >
        <View style={styles.debtLeft}>
          <View style={[
            styles.debtIcon,
            { backgroundColor: isOwedToMe ? colors.successLight : colors.dangerLight }
          ]}>
            <Ionicons
              name={isOwedToMe ? 'arrow-down' : 'arrow-up'}
              size={20}
              color={isOwedToMe ? colors.success : colors.danger}
            />
          </View>
          <View style={styles.debtInfo}>
            <Text style={[styles.debtName, { color: colors.text }]}>
              {item.name}
            </Text>
            {item.dueDate && (
              <Text style={[
                styles.debtDueDate,
                { color: isOverdue ? colors.danger : colors.textSecondary }
              ]}>
                {isOverdue ? 'Просрочено' : 'До'}: {formatDate(item.dueDate)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.debtRight}>
          <Text style={[
            styles.debtAmount,
            { color: isOwedToMe ? colors.success : colors.danger }
          ]}>
            {isOwedToMe ? '+' : '-'}{formatAmount(item.amount)}
          </Text>
          {item.isIncludedInTotal === false && (
            <Text style={[styles.notIncludedText, { color: colors.textSecondary }]}>
              Не в итоге
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.summary, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {t('accounts.owedToMe')}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            +{formatAmount(totalOwedToMe)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
           {t('accounts.owedByMe')}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.danger }]}>
            -{formatAmount(totalOwedByMe)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
         {t('debts.allDebts')}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('debts.emptyState')}
      </Text>
      <TouchableOpacity
        style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addFirstButtonText}>{t('debts.addFirstDebt')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={debts}
        renderItem={renderDebtItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={debts.length === 0 ? styles.emptyContainer : undefined}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {showAddModal && (
        <AddDebtModal
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingDebt(null);
          }}
          onSave={handleAddDebt}
          editingDebt={editingDebt}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  debtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '500',
  },
  debtDueDate: {
    fontSize: 14,
    marginTop: 2,
  },
  debtRight: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  notIncludedText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  addFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
}); 