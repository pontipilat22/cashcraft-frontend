import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { CategoriesScreen } from './CategoriesScreen';
import { SubscriptionScreen } from './SubscriptionScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalization } from '../context/LocalizationContext';
import { getCurrentLanguage } from '../services/i18n';

export const MoreScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetAllData } = useData();
  const { user, logout } = useAuth();
  const { isPremium, checkIfPremium } = useSubscription();
  const [showCategories, setShowCategories] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const navigation = useNavigation<any>();
  const { t } = useLocalization();
  const currentLanguage = getCurrentLanguage();

  // Пользовательская информация теперь берется из AuthContext

  useEffect(() => {
    // Проверяем статус подписки при загрузке
    checkIfPremium();
  }, []);

  const handleResetData = () => {
    Alert.alert(
      t('common.resetAllDataTitle'),
      t('common.resetAllDataMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              Alert.alert(t('common.success'), t('common.dataResetSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), t('common.dataResetError'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const menuItems = [
    {
      id: 'settings',
      title: t('settings.title'),
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'categories',
      title: t('common.categories'),
      icon: 'grid-outline',
      onPress: () => setShowCategories(true),
    },
    {
      id: 'export-import',
      title: t('export.title') || 'Экспорт и импорт',
      icon: 'sync-outline',
      onPress: () => navigation.navigate('ExportImport'),
    },
    {
      id: 'help',
      title: t('common.help'),
      icon: 'help-circle-outline',
      onPress: () => navigation.navigate('Help'),
    },
    {
      id: 'refresh-subscription',
      title: 'Обновить статус подписки',
      icon: 'refresh-outline',
      onPress: async () => {
        const hasPremium = await checkIfPremium();
        Alert.alert('Готово', `Статус подписки обновлен. Premium: ${hasPremium ? 'Да' : 'Нет'}`);
      },
    },
  ];

  const renderMenuItem = (item: typeof menuItems[0]) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={item.onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={item.icon as any} size={24} color={colors.primary} />
        </View>
        <Text style={[styles.menuItemTitle, { color: colors.text, marginLeft: 16 }]}>
          {item.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {user && !user.isGuest && (
          <View style={[styles.userCard, { backgroundColor: colors.card }]}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.userAvatarText}>
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              {user.displayName && (
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user.displayName}
                </Text>
              )}
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Кнопка подписки */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.premiumBanner, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (user?.isGuest) {
                Alert.alert(
                  t('premium.loginRequired'),
                  t('premium.loginRequiredMessage'),
                  [
                    {
                      text: t('common.cancel'),
                      style: 'cancel',
                    },
                    {
                      text: t('premium.login'),
                      onPress: logout,
                    },
                  ]
                );
              } else {
                setShowSubscription(true);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.premiumContent}>
              <Ionicons name="diamond" size={24} color="#fff" />
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>
                  {user?.isGuest ? t('premium.loginForPremium') : t('premium.tryPremium')}
                </Text>
                <Text style={styles.premiumSubtitle}>
                  {user?.isGuest ? t('premium.createAccountForSubscription') : t('premium.unlockFeatures')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {isPremium && (
          <TouchableOpacity
            style={[styles.premiumBanner, styles.activePremiumBanner, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => setShowSubscription(true)}
            activeOpacity={0.8}
          >
            <View style={styles.premiumContent}>
              <Ionicons name="diamond" size={24} color={colors.primary} />
              <View style={styles.premiumTextContainer}>
                <Text style={[styles.premiumTitle, { color: colors.text }]}>
                  {t('premium.premiumActive')}
                </Text>
                <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
                  {t('premium.manageSubscription')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={[styles.menuSection, { backgroundColor: colors.card }]}>
          {menuItems.map(renderMenuItem)}
        </View>



        {/* Опасная зона */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 20 }]}>
          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.7}
            onPress={handleResetData}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#ff444420' }]}>
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </View>
              <Text style={[styles.menuItemTitle, { color: '#ff4444', marginLeft: 16 }]}>
                {t('common.resetAllData')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Модальные окна */}
      <Modal
        visible={showCategories}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCategories(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('common.categories')}
            </Text>
            <View style={{ width: 40 }}></View>
          </View>
          <CategoriesScreen />
        </View>
      </Modal>

      <Modal
        visible={showSubscription}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
          checkIfPremium();
        }}
      >
        <SubscriptionScreen onClose={() => {
          setShowSubscription(false);
          checkIfPremium();
        }} />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  premiumBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePremiumBanner: {
    borderWidth: 1,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  menuSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
  },
  syncTimeText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
  },
}); 