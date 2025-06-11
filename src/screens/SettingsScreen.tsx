import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../config/currencies';

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, currentLanguage, setLanguage, languages } = useLocalization();
  const { defaultCurrency, setDefaultCurrency } = useCurrency();
  const { user, logout } = useAuth();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t('settings.language')}
          </Text>
          <FlatList
            data={Object.values(languages)}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.border },
                  item.code === currentLanguage && styles.selectedItem,
                ]}
                onPress={async () => {
                  await setLanguage(item.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    { color: colors.text },
                    item.code === currentLanguage && { color: colors.primary },
                  ]}
                >
                  {item.nativeName}
                </Text>
                {item.code === currentLanguage && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderCurrencyModal = () => (
    <Modal
      visible={showCurrencyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCurrencyModal(false)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setShowCurrencyModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t('settings.currency')}
          </Text>
          <FlatList
            data={Object.values(CURRENCIES)}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.border },
                  item.code === defaultCurrency && styles.selectedItem,
                ]}
                onPress={async () => {
                  await setDefaultCurrency(item.code);
                  setShowCurrencyModal(false);
                }}
              >
                <View style={styles.modalItemContent}>
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: colors.text },
                      item.code === defaultCurrency && { color: colors.primary },
                    ]}
                  >
                    {item.symbol}
                  </Text>
                  <View style={styles.currencyInfo}>
                    <Text
                      style={[
                        styles.modalItemText,
                        { color: colors.text },
                        item.code === defaultCurrency && { color: colors.primary },
                      ]}
                    >
                      {item.code}
                    </Text>
                    <Text
                      style={[
                        styles.currencyName,
                        { color: colors.textSecondary },
                        item.code === defaultCurrency && { color: colors.primary },
                      ]}
                    >
                      {t(`currencies.${item.code}`)}
                    </Text>
                  </View>
                </View>
                {item.code === defaultCurrency && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSettingItem = (
    icon: string,
    title: string,
    value?: string,
    onPress?: () => void,
    showSwitch?: boolean,
    switchValue?: boolean,
    onSwitchChange?: (value: boolean) => void
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
        <Text style={[styles.settingItemTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.settingItemRight}>
        {value && (
          <Text style={[styles.settingItemValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('settings.title')}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('common.preferences')}
          </Text>
          
          {renderSettingItem(
            'language-outline',
            t('settings.language'),
            languages[currentLanguage]?.nativeName,
            () => setShowLanguageModal(true)
          )}
          
          {renderSettingItem(
            'cash-outline',
            t('settings.currency'),
            `${CURRENCIES[defaultCurrency]?.symbol} ${defaultCurrency}`,
            () => setShowCurrencyModal(true)
          )}
          
          {renderSettingItem(
            'moon-outline',
            t('settings.darkMode'),
            undefined,
            undefined,
            true,
            isDark,
            toggleTheme
          )}
        </View>

        {user && !user.isGuest && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('common.account')}
            </Text>
            
            <View style={[styles.userInfo, { borderBottomColor: colors.border }]}>
              <Text style={[styles.userEmail, { color: colors.text }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('common.about')}
          </Text>
          
          {renderSettingItem(
            'information-circle-outline',
            t('settings.version'),
            '1.0.0'
          )}
          
          {renderSettingItem(
            'shield-checkmark-outline',
            t('settings.privacyPolicy'),
            undefined,
            () => {}
          )}
          
          {renderSettingItem(
            'document-text-outline',
            t('settings.termsOfService'),
            undefined,
            () => {}
          )}
        </View>

        {user && (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: user.isGuest ? colors.primary : colors.danger }]}
            onPress={user.isGuest ? logout : handleLogout}
          >
            <Ionicons name={user.isGuest ? "log-in-outline" : "log-out-outline"} size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>
              {user.isGuest ? t('auth.login') : t('auth.logout')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {renderLanguageModal()}
      {renderCurrencyModal()}
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
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemValue: {
    fontSize: 14,
    marginRight: 8,
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userEmail: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    width: 40,
  },
  currencyInfo: {
    marginLeft: 12,
    flex: 1,
  },
  currencyName: {
    fontSize: 12,
    marginTop: 2,
  },
}); 