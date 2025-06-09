import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Modal, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { CategoriesScreen } from './CategoriesScreen';

export const MoreScreen: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetAllData } = useData();
  const [showCategories, setShowCategories] = useState(false);

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
}); 