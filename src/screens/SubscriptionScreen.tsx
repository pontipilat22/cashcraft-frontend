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
import { SUBSCRIPTION_SKUS, SubscriptionSKU } from '../services/iapService';

interface SubscriptionPlan {
  id: SubscriptionSKU;
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
  const { 
    subscription, 
    isLoading: contextLoading,
    availableProducts,
    checkIfPremium, 
    activateSubscription, 
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    initializeIAP
  } = useSubscription();
  const navigation = useNavigation();
  const { t } = useLocalization();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionSKU>(SUBSCRIPTION_SKUS.MONTHLY);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Генерируем планы на основе доступных продуктов или используем дефолтные
  const plans: SubscriptionPlan[] = React.useMemo(() => {
    const defaultPlans: SubscriptionPlan[] = [
      {
        id: SUBSCRIPTION_SKUS.MONTHLY,
        name: 'Premium на месяц',
        price: '$2.99',
        period: '/месяц',
        description: [
          '🚫 Отключение ВСЕЙ рекламы',
          '♾️ Неограниченное количество счетов',
          '💰 Поддержка разработки приложения',
        ],
      },
      {
        id: SUBSCRIPTION_SKUS.YEARLY,
        name: 'Premium на год',
        price: '$19.99',
        period: '/год',
        pricePerMonth: '$1.67/месяц',
        badge: 'Экономия 44%',
        description: [
          '🚫 Отключение ВСЕЙ рекламы на год',
          '♾️ Неограниченное количество счетов',
          '💎 Самый выгодный план',
          '💰 Поддержка разработки приложения',
        ],
      },
    ];

    // Если у нас есть продукты из Google Play, используем их цены
    if (availableProducts.length > 0) {
      return defaultPlans.map(plan => {
        const product = availableProducts.find(p => p.id === plan.id);
        if (product) {
          return {
            ...plan,
            name: product.title || plan.name,
            price: product.displayPrice || String(product.price) || plan.price,
            description: [product.description || '', ...plan.description.slice(1)],
          };
        }
        return plan;
      });
    }

    return defaultPlans;
  }, [availableProducts, t]);

  useEffect(() => {
    console.log('🔍 [SubscriptionScreen] useEffect triggered');
    loadSubscriptionStatus();
    // Принудительно инициализируем IAP если еще не инициализирован
    initializeIAP();
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

      // Проверяем, что IAP инициализирован, если нет - пытаемся инициализировать
      if (availableProducts.length === 0) {
        console.log('🔄 [SubscriptionScreen] IAP не инициализирован, пытаемся инициализировать...');
        const initialized = await initializeIAP();
        if (!initialized) {
          Alert.alert(
            t('common.error'), 
            'Сервис покупок временно недоступен. Попробуйте позже.'
          );
          return;
        }
      }

      // Покупаем подписку через Google Play/App Store
      const success = await purchaseSubscription(selectedPlan);
      
      if (success) {
        Alert.alert(
          t('premium.subscribeSuccess'),
          t('premium.subscriptionSuccessMessage', { planName: plan.name.toLowerCase() }),
          [
            {
              text: 'OK',
              onPress: handleGoBack,
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('premium.subscribeError'));
      }
    } catch (error) {
      console.error('Purchase error:', error);
      
      // Более дружелюбная обработка ошибок
      let errorMessage = t('premium.subscribeError');
      let errorDetails = '';

      if (error instanceof Error) {
        console.error('❌ [SubscriptionScreen] Purchase error details:', {
          message: error.message,
          stack: error.stack,
        });

        if (error.message.includes('IAPService не инициализирован')) {
          errorMessage = 'Сервис покупок еще загружается. Попробуйте через несколько секунд.';
        } else if (error.message.includes('User cancelled') || error.message.includes('cancelled')) {
          errorMessage = 'Покупка отменена пользователем.';
        } else if (error.message.includes('еще не активирована в Google Play Console')) {
          errorMessage = '⚠️ Подписки настраиваются в Google Play Console.\n\nВозможные причины:\n\n1. Подписки только что созданы (нужно подождать 1-24 часа)\n2. У подписок нет базового плана с ценой\n3. Подписки не активированы\n\nПроверьте логи приложения для подробностей.';
          errorDetails = '\n\nID подписок:\n• cashcraft_monthly\n• cashcraft_yearly';
        } else if (error.message.includes('offerToken')) {
          errorMessage = '⚠️ Не найден токен предложения подписки.\n\nЭто означает, что в Google Play Console:\n\n1. У подписки нет базового плана\n2. Или базовый план не активирован\n3. Или нужно подождать синхронизации (до 24 часов)\n\nПодробности в логах приложения.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(t('common.error'), errorMessage + errorDetails);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      
      // Проверяем, что IAP инициализирован
      if (availableProducts.length === 0) {
        console.log('🔄 [SubscriptionScreen] IAP не инициализирован для восстановления, пытаемся инициализировать...');
        const initialized = await initializeIAP();
        if (!initialized) {
          Alert.alert(
            t('common.error'), 
            'Сервис покупок временно недоступен. Попробуйте позже.'
          );
          return;
        }
      }
      
      const success = await restorePurchases();
      
      if (success) {
        Alert.alert(
          t('premium.restoreSuccess'),
          t('premium.restoreSuccessMessage'),
          [
            {
              text: 'OK',
              onPress: handleGoBack,
            },
          ]
        );
      } else {
        Alert.alert(
          t('premium.restoreNoSubscriptions'),
          t('premium.restoreNoSubscriptionsMessage')
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      
      // Более дружелюбная обработка ошибок
      let errorMessage = t('premium.restoreError');
      if (error instanceof Error) {
        if (error.message.includes('IAPService не инициализирован')) {
          errorMessage = 'Сервис покупок еще загружается. Попробуйте через несколько секунд.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(t('common.error'), errorMessage);
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
      t('premium.deleteSubscriptionTitle'),
      t('premium.deleteSubscriptionConfirm'),
      [
        {
          text: t('premium.cancel'),
          style: 'cancel',
        },
        {
          text: t('premium.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              setCurrentSubscription(null);
              Alert.alert(t('premium.deleteSubscriptionSuccess'), t('premium.deleteSubscriptionSuccessMessage'));
            } catch (error) {
              Alert.alert(t('common.error'), t('premium.deleteSubscriptionError'));
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('premium.subscription')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.activeSubscriptionCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={60} color={colors.primary} />
            <Text style={[styles.activeTitle, { color: colors.text }]}>
              {currentSubscription.planName}
            </Text>
            <Text style={[styles.activeStatus, { color: colors.primary }]}>
              {t('premium.active')}
            </Text>
            <Text style={[styles.activeUntil, { color: colors.textSecondary }]}>
              {t('premium.activeFor', { 
                days: daysLeft, 
                dayWord: daysLeft === 1 ? t('premium.day') : t('premium.days') 
              })}
            </Text>
            <Text style={[styles.activeDate, { color: colors.textSecondary }]}>
              {t('premium.until')} {endDate.toLocaleDateString('ru-RU')}
            </Text>

            {!currentSubscription.willRenew && (
              <View style={[styles.warningBox, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="information-circle" size={20} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  {t('premium.autoRenewalDisabled')}
                </Text>
              </View>
            )}

            {currentSubscription.willRenew !== false && (
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.danger }]}
                onPress={handleCancelSubscription}
              >
                <Text style={[styles.cancelButtonText, { color: colors.danger }]}>
                  {t('premium.cancelSubscriptionButton')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.danger, backgroundColor: colors.danger + '10' }]}
              onPress={handleDeleteSubscription}
            >
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                {t('premium.deleteSubscription')}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('premium.subscriptionPremium')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Ionicons name="diamond" size={60} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t('premium.getFullAccess')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {t('premium.unlockAllFeatures')}
          </Text>

          {/* Показываем индикатор загрузки цен */}
          {availableProducts.length === 0 && isLoading && (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Загружаем актуальные цены...
            </Text>
          )}

          {/* Кнопка отладки */}
          <TouchableOpacity
            onPress={() => setShowDebugInfo(!showDebugInfo)}
            style={[styles.debugButton, { backgroundColor: colors.border }]}
          >
            <Ionicons name="bug" size={16} color={colors.textSecondary} />
            <Text style={[styles.debugButtonText, { color: colors.textSecondary }]}>
              {showDebugInfo ? 'Скрыть отладку' : 'Показать отладку'}
            </Text>
          </TouchableOpacity>

          {/* Отладочная информация */}
          {showDebugInfo && (
            <View style={[styles.debugInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.debugTitle, { color: colors.text }]}>Информация о продуктах:</Text>
              <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                Найдено продуктов: {availableProducts.length}
              </Text>
              {availableProducts.length === 0 ? (
                <Text style={[styles.debugText, { color: colors.danger }]}>
                  ⚠️ Продукты не загружены!{'\n'}
                  Возможные причины:{'\n'}
                  • Подписки не созданы в Google Play Console{'\n'}
                  • Подписки не активированы{'\n'}
                  • Нет базовых планов с ценами{'\n'}
                  • Ожидание синхронизации (до 24 часов)
                </Text>
              ) : (
                availableProducts.map((product, index) => (
                  <View key={product.id} style={styles.debugProduct}>
                    <Text style={[styles.debugProductTitle, { color: colors.primary }]}>
                      Продукт {index + 1}: {product.id}
                    </Text>
                    <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                      Название: {product.title || 'Нет'}
                    </Text>
                    <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                      Цена: {product.displayPrice || String(product.price) || 'Нет'}
                    </Text>
                    <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                      Описание: {product.description || 'Нет'}
                    </Text>
                    <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                      Детали предложений: {(product as any).subscriptionOfferDetails?.length || 0}
                    </Text>
                    {(product as any).subscriptionOfferDetails && (
                      <Text style={[styles.debugText, { color: colors.success }]}>
                        ✅ Есть offerToken - можно покупать
                      </Text>
                    )}
                    {!(product as any).subscriptionOfferDetails && (
                      <Text style={[styles.debugText, { color: colors.danger }]}>
                        ❌ НЕТ offerToken - нужен базовый план!
                      </Text>
                    )}
                  </View>
                ))
              )}
              <Text style={[styles.debugText, { color: colors.textSecondary, marginTop: 10 }]}>
                Проверьте логи Metro (npx react-native log-android) для подробной информации
              </Text>
            </View>
          )}
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
            (isLoading || contextLoading) && styles.disabledButton,
          ]}
          onPress={handleSubscribe}
          disabled={isLoading || contextLoading}
          activeOpacity={0.8}
        >
          {(isLoading || contextLoading) ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {t('premium.subscribeButton')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.restoreButton,
            { borderColor: colors.primary }
          ]}
          onPress={handleRestorePurchases}
          disabled={isLoading || contextLoading}
          activeOpacity={0.8}
        >
          {(isLoading || contextLoading) ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
              {t('premium.restoreButton')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          {t('premium.disclaimer')}
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
  restoreButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  restoreButtonText: {
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
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rewardedAdSection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  rewardedAdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardedAdTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  rewardedAdDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  rewardedAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    borderWidth: 2,
  },
  rewardedAdButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 12,
  },
  unlockedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  unlockedText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  debugInfo: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  debugProduct: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  debugProductTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
});