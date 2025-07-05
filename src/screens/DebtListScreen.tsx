import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLocalization } from '../context/LocalizationContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { Debt } from '../types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DebtActionsModal } from '../components/DebtActionsModal';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

interface DebtListScreenProps {
  route: {
    params: {
      type: 'owed_to_me' | 'owed_by_me';
    };
  };
  navigation: any;
}

export const DebtListScreen: React.FC<DebtListScreenProps> = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { formatAmount } = useCurrency();
  const { t } = useLocalization();
  const { type } = route.params;
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // Загружаем долги при фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      loadDebts();
    }, [type])
  );

  const loadDebts = async () => {
    setLoading(true);
    const allDebts = await LocalDatabaseService.getDebts();
    const filteredDebts = allDebts.filter((d: Debt) => d.type === type);
    setDebts(filteredDebts);
    
    // Рассчитываем общую сумму
    const total = filteredDebts.reduce((sum, debt) => {
      const convertedAmount = debt.currency && debt.exchangeRate && debt.currency !== 'RUB' 
        ? debt.amount * debt.exchangeRate 
        : debt.amount;
      return sum + convertedAmount;
    }, 0);
    setTotalAmount(total);
    
    setLoading(false);
  };

  const handleLongPress = (debt: Debt) => {
    setSelectedDebt(debt);
    setActionsModalVisible(true);
  };

  const renderDebt = ({ item }: { item: Debt }) => {
    // Конвертируем сумму если валюта отличается от основной
    const convertedAmount = item.currency && item.exchangeRate && item.currency !== 'RUB' 
      ? item.amount * item.exchangeRate 
      : item.amount;

    // Проверяем просрочен ли долг
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

    return (
      <TouchableOpacity 
        style={[styles.debtItem, { 
          backgroundColor: colors.card,
          borderLeftWidth: 4,
          borderLeftColor: type === 'owed_to_me' ? colors.success : colors.danger,
        }]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.debtContent}>
          <View style={[styles.debtIcon, { 
            backgroundColor: type === 'owed_to_me' 
              ? isDark ? '#10B98120' : '#10B98115' 
              : isDark ? '#EF444420' : '#EF444415' 
          }]}>
            <Ionicons 
              name={type === 'owed_to_me' ? 'arrow-down-circle' : 'arrow-up-circle'} 
              size={24} 
              color={type === 'owed_to_me' ? colors.success : colors.danger} 
            />
          </View>
          
          <View style={styles.debtInfo}>
            <View style={styles.debtDetails}>
              <Text style={[styles.debtName, { color: colors.text }]}>{item.name}</Text>
              <View style={styles.debtMeta}>
                <Text style={[styles.debtDate, { color: colors.textSecondary }]}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }) : ''}
                </Text>
                {item.dueDate && (
                  <View style={styles.dueDateContainer}>
                    <Text style={[styles.dueDateSeparator, { color: colors.textSecondary }]}>•</Text>
                    <Ionicons 
                      name="calendar-outline" 
                      size={12} 
                      color={isOverdue ? colors.danger : colors.textSecondary} 
                    />
                    <Text style={[styles.dueDate, { 
                      color: isOverdue ? colors.danger : colors.textSecondary,
                      fontWeight: isOverdue ? '600' : '400'
                    }]}>
                      {new Date(item.dueDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {item.currency && item.currency !== 'RUB' && (
                <View style={styles.currencyInfo}>
                  <Text style={[styles.debtCurrency, { color: colors.textSecondary }]}>
                    {formatAmount(item.amount)} {item.currency}
                  </Text>
                  <Ionicons name="swap-horizontal" size={12} color={colors.textSecondary} style={styles.currencyIcon} />
                  <Text style={[styles.debtCurrency, { color: colors.textSecondary }]}>
                    {formatAmount(convertedAmount)} RUB
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.debtAmount, { 
                color: type === 'owed_to_me' ? colors.success : colors.danger 
              }]}>
                {type === 'owed_to_me' ? '+' : '-'}{formatAmount(convertedAmount)}
              </Text>
              {!item.isIncludedInTotal && (
                <Text style={[styles.notIncludedBadge, { color: colors.textSecondary }]}>
                  {t('debts.notInTotal')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={type === 'owed_to_me' 
          ? (isDark ? ['#10B98140', '#10B98110'] : ['#10B98120', '#10B98105'])
          : (isDark ? ['#EF444440', '#EF444410'] : ['#EF444420', '#EF444405'])
        }
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: colors.card }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              {type === 'owed_to_me' ? t('accounts.owedToMe') : t('accounts.owedByMe')}
            </Text>
            <Text style={[styles.totalAmount, { 
              color: type === 'owed_to_me' ? colors.success : colors.danger 
            }]}>
              {formatAmount(totalAmount)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t(type === 'owed_to_me' ? 'debts.owedToMeDescription' : 'debts.owedByMeDescription')}
        </Text>
      </LinearGradient>

      {debts.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Ionicons 
              name={type === 'owed_to_me' ? 'cash-outline' : 'receipt-outline'} 
              size={48} 
              color={colors.textSecondary} 
            />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t(type === 'owed_to_me' ? 'debts.owedToMeEmpty' : 'debts.owedByMeEmpty')}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {t('debts.emptySubtext')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={debts}
          renderItem={renderDebt}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DebtActionsModal
        visible={actionsModalVisible}
        debt={selectedDebt}
        onClose={() => setActionsModalVisible(false)}
        onUpdate={loadDebts}
      />
    </SafeAreaView>
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 10,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  debtContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  debtIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  debtDetails: {
    flex: 1,
  },
  debtName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  debtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  debtDate: {
    fontSize: 12,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  dueDateSeparator: {
    marginHorizontal: 2,
  },
  dueDate: {
    fontSize: 12,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currencyIcon: {
    marginHorizontal: 4,
  },
  debtCurrency: {
    fontSize: 13,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  notIncludedBadge: {
    fontSize: 10,
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 