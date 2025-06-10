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

export const MoreScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetAllData, syncData, isSyncing, lastSyncTime } = useData();
  const { user, logout } = useAuth();
  const { isPremium, checkSubscription } = useSubscription();
  const [showCategories, setShowCategories] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  // Пользовательская информация теперь берется из AuthContext

  const handleResetData = () => {
    Alert.alert(
      'Сбросить все данные?',
      'Это действие удалит все счета, транзакции и пользовательские категории. Действие нельзя отменить!',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              Alert.alert('Успешно', 'Все данные были сброшены');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось сбросить данные');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Информация о пользователе */}
        <View style={[styles.userSection, { backgroundColor: colors.card }]}>
        <View style={styles.userInfo}>
          <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || 'Загрузка...'}
            </Text>
            {user?.email && (
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
            )}
            {user?.isGuest && (
              <TouchableOpacity onPress={logout}>
                <Text style={[styles.createAccountLink, { color: colors.primary }]}>
                  Создать аккаунт →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Кнопка подписки */}
      {!isPremium && (
        <TouchableOpacity
          style={[styles.premiumBanner, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (user?.isGuest) {
              Alert.alert(
                'Требуется вход',
                'Для оформления подписки необходимо войти в аккаунт',
                [
                  {
                    text: 'Отмена',
                    style: 'cancel',
                  },
                  {
                    text: 'Войти',
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
                {user?.isGuest ? 'Войдите для Premium' : 'Попробуйте Premium'}
              </Text>
              <Text style={styles.premiumSubtitle}>
                {user?.isGuest ? 'Создайте аккаунт для подписки' : 'Разблокируйте все возможности'}
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
              <Text style={[styles.premiumTitle, { color: colors.text }]}>Premium активен</Text>
              <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>Управление подпиской</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Синхронизация */}
      {!user?.isGuest && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => syncData()}
            disabled={isSyncing}
          >
            <View style={styles.settingLeft}>
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-outline" size={24} color={colors.text} />
              )}
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                </Text>
                {lastSyncTime && (
                  <Text style={[styles.syncTimeText, { color: colors.textSecondary }]}>
                    Последняя: {new Date(lastSyncTime).toLocaleString('ru')}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Темная тема</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.settingRow} 
          activeOpacity={0.7}
          onPress={() => setShowCategories(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="grid-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Категории</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]}></View>

        <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
          <View style={styles.settingLeft}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Настройки</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]}></View>

        <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>Помощь</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]}></View>

        <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.settingText, { color: colors.text }]}>О приложении</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, styles.dangerSection, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.settingRow} 
          activeOpacity={0.7}
          onPress={handleResetData}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="trash-outline" size={24} color="#f44336" />
            <Text style={[styles.settingText, { color: '#f44336' }]}>
              Сбросить все данные
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!user?.isGuest && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={logout}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Выйти из аккаунта
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Категории</Text>
            <View style={{ width: 40 }}></View>
          </View>
          <CategoriesScreen />
        </View>
      </Modal>

      <Modal
        visible={showSubscription}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={checkSubscription}
      >
        <SubscriptionScreen onClose={() => {
          setShowSubscription(false);
          checkSubscription();
        }} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    marginLeft: 52,
    marginRight: 16,
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
  dangerSection: {
    marginTop: 40,
  },
  userSection: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBanner: {
    marginTop: 16,
    marginHorizontal: 16,
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
  syncTimeText: {
    fontSize: 12,
    marginTop: 2,
  },
}); 