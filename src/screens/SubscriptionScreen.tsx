import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string[];
  pricePerMonth?: string;
  badge?: string;
}

// Plans will be initialized inside component to use translations

interface SubscriptionScreenProps {
  onClose?: () => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onClose }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { subscription, checkIfPremium, activateSubscription, cancelSubscription } = useSubscription();
  const navigation = useNavigation();
  const { t } = useLocalization();
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  const plans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      name: t('premium.monthlySubscription'),
      price: '$2',
      period: '/месяц',
      description: [
        t('premium.features.unlimitedAccounts'),
        t('premium.features.dataExport'),
        t('premium.features.advancedAnalytics'),
        t('premium.features.deviceSync'),
        t('premium.features.prioritySupport'),
      ],
    },
    {
      id: 'yearly',
      name: t('premium.yearlySubscription'),
      price: '$15',
      period: '/год',
      pricePerMonth: '$1.25/мес',
      badge: t('premium.savingsBadge'),
      description: [
        t('premium.features.unlimitedAccounts'),
        t('premium.features.yearlySavings'),
        t('premium.features.exclusiveThemes'),
        t('premium.features.earlyAccess'),
        t('premium.features.personalConsultations'),
      ],
    },
  ];

  useEffect(() => {
    console.log('🔍 [SubscriptionScreen] useEffect triggered');
    loadSubscriptionStatus();
  }, []);

  const handleGoBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const loadSubscriptionStatus = async () => {
    const hasPremium = await checkIfPremium();
    if (hasPremium && subscription) {
      setCurrentSubscription(subscription);
    }
  };

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) return;

      // Симуляция процесса оплаты
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Активируем подписку
      const days = selectedPlan === 'monthly' ? 30 : 365;
      await activateSubscription(plan.id, plan.name, plan.price, days);
      
      Alert.alert(
        t('premium.subscribeSuccess'),
        `Вы успешно оформили ${plan.name.toLowerCase()}`,
        [
          {
            text: 'OK',
            onPress: handleGoBack,
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('premium.subscribeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      t('premium.cancelSubscription'),
      t('premium.cancelConfirmation'),
      [
        {
          text: t('premium.no'),
          style: 'cancel',
        },
        {
          text: t('premium.cancelYes'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentSubscription) return;
              
              // Обновляем подписку с флагом willRenew: false
              const updatedSubscription = { ...currentSubscription, willRenew: false };
              
              if (user?.id) {
                const subscriptionKey = `subscription_${user.id}`;
                await AsyncStorage.setItem(subscriptionKey, JSON.stringify(updatedSubscription));
                setCurrentSubscription(updatedSubscription);
              }
              
              Alert.alert(t('premium.subscriptionCancelled'), t('premium.subscriptionCancelledMessage'));
            } catch (error) {
              Alert.alert(t('common.error'), t('premium.cancelError'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubscription = async () => {
    Alert.alert(
      'Удалить подписку',
      'Вы уверены, что хотите полностью удалить подписку? Это действие нельзя отменить.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              setCurrentSubscription(null);
              Alert.alert('Подписка удалена', 'Ваша подписка была успешно удалена.');
            } catch (error) {
              Alert.alert(t('common.error'), 'Ошибка при удалении подписки');
            }
          },
        },
      ]
    );
  };

  if (currentSubscription?.isActive) {
    const endDate = new Date(currentSubscription.endDate);
    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Подписка</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.activeSubscriptionCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={60} color={colors.primary} />
            <Text style={[styles.activeTitle, { color: colors.text }]}>
              {currentSubscription.planName}
            </Text>
            <Text style={[styles.activeStatus, { color: colors.primary }]}>
              Активна
            </Text>
            <Text style={[styles.activeUntil, { color: colors.textSecondary }]}>
              {t('premium.activeFor', { 
                days: daysLeft, 
                dayWord: daysLeft === 1 ? t('premium.day') : t('premium.days') 
              })}
            </Text>
            <Text style={[styles.activeDate, { color: colors.textSecondary }]}>
              До {endDate.toLocaleDateString('ru-RU')}
            </Text>

            {!currentSubscription.willRenew && (
              <View style={[styles.warningBox, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="information-circle" size={20} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Автопродление отключено
                </Text>
              </View>
            )}

            {currentSubscription.willRenew !== false && (
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.danger }]}
                onPress={handleCancelSubscription}
              >
                <Text style={[styles.cancelButtonText, { color: colors.danger }]}>
                  Отменить подписку
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.danger, backgroundColor: colors.danger + '10' }]}
              onPress={handleDeleteSubscription}
            >
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                Удалить подписку
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Подписка Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Ionicons name="diamond" size={60} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Получите полный доступ
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Разблокируйте все возможности CashCraft
          </Text>
        </View>

        <View style={styles.plansSection}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                { 
                  backgroundColor: colors.card,
                  borderColor: selectedPlan === plan.id ? colors.primary : colors.border,
                  borderWidth: selectedPlan === plan.id ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.8}
            >
              {plan.badge && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>{plan.price}</Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                    {plan.period}
                  </Text>
                </View>
                {plan.pricePerMonth && (
                  <Text style={[styles.pricePerMonth, { color: colors.textSecondary }]}>
                    {plan.pricePerMonth}
                  </Text>
                )}
              </View>

              <View style={styles.planFeatures}>
                {plan.description.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={colors.primary} 
                      style={styles.featureIcon}
                    />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {selectedPlan === plan.id && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: colors.primary },
            isLoading && styles.disabledButton,
          ]}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Оформить подписку
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          • Оплата будет снята с вашего счета после подтверждения покупки{'\n'}
          • Подписка автоматически продлевается, если не отменена{'\n'}
          • Вы можете отменить подписку в любое время
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  plansSection: {
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  pricePerMonth: {
    fontSize: 14,
    marginTop: 4,
  },
  planFeatures: {
    marginTop: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  activeSubscriptionCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  activeStatus: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  activeUntil: {
    fontSize: 16,
    marginTop: 16,
  },
  activeDate: {
    fontSize: 14,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    marginLeft: 8,
  },
  deleteButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 