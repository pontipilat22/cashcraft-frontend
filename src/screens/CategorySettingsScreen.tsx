import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useLocalization } from '../context/LocalizationContext';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { AddCategoryModal } from '../components/AddCategoryModal';

export const CategorySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { categories, updateCategory, deleteCategory } = useData();
  const { t } = useLocalization();

  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    // Filter only expense categories
    const filteredCategories = categories.filter(cat => cat.type === 'expense');
    setExpenseCategories(filteredCategories);
  }, [categories]);

  const handleBudgetCategoryChange = async (categoryId: string, newBudgetCategory: 'essential' | 'nonEssential' | undefined) => {
    try {
      await updateCategory(categoryId, { budgetCategory: newBudgetCategory });

      // Update local state
      setExpenseCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? { ...cat, budgetCategory: newBudgetCategory }
            : cat
        )
      );
    } catch (error) {
      console.error('Error updating category budget type:', error);
      Alert.alert(
        t('common.error'),
        t('categories.updateError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const getBudgetCategoryLabel = (budgetCategory?: string) => {
    switch (budgetCategory) {
      case 'essential':
        return t('plans.essential');
      case 'nonEssential':
        return t('plans.nonEssential');
      default:
        return t('plans.notSet');
    }
  };

  const getBudgetCategoryColor = (budgetCategory?: string) => {
    switch (budgetCategory) {
      case 'essential':
        return '#FF5722'; // Orange for essential
      case 'nonEssential':
        return '#9C27B0'; // Purple for non-essential
      default:
        return colors.textSecondary; // Gray for not set
    }
  };

  const handleDeleteCategory = (category: any) => {
    // Проверяем, что это не базовая категория "Другое"
    if (category.id === 'other_income' || category.id === 'other_expense') {
      Alert.alert(
        t('common.error'),
        t('categories.cannotDeleteDefault') || 'Базовую категорию "Другое" нельзя удалить'
      );
      return;
    }

    const localizedCategory = getLocalizedCategory(category, t);
    Alert.alert(
      t('categories.deleteCategory') || 'Удалить категорию?',
      t('categories.deleteCategoryMessage', { name: localizedCategory.name }) || `Все транзакции категории "${localizedCategory.name}" будут перемещены в "Другое"`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(t('common.error'), t('categories.deleteError') || 'Не удалось удалить категорию');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.navigationHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navigationTitle, { color: colors.text }]}>
          {t('categories.budgetSettings')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Управляйте категориями расходов и назначайте им типы для системы бюджетирования
          </Text>
        </View>

        {/* Кнопка добавления категории */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>
            Добавить категорию
          </Text>
        </TouchableOpacity>

        <View style={styles.categoriesList}>
          {expenseCategories.map(category => {
            const localizedCategory = getLocalizedCategory(category, t);
            return (
              <View
                key={category.id}
                style={[styles.categoryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryDetails}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {localizedCategory.name}
                    </Text>
                    <Text
                      style={[
                        styles.budgetCategoryLabel,
                        { color: getBudgetCategoryColor(category.budgetCategory) }
                      ]}
                    >
                      {getBudgetCategoryLabel(category.budgetCategory)}
                    </Text>
                  </View>

                  {/* Кнопка удаления */}
                  {category.id !== 'other_income' && category.id !== 'other_expense' && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.budgetTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      category.budgetCategory === 'essential' && styles.budgetTypeButtonActive,
                      { borderColor: '#FF5722' },
                      category.budgetCategory === 'essential' && { backgroundColor: '#FF5722' }
                    ]}
                    onPress={() => handleBudgetCategoryChange(
                      category.id,
                      category.budgetCategory === 'essential' ? undefined : 'essential'
                    )}
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        { color: category.budgetCategory === 'essential' ? '#fff' : '#FF5722' }
                      ]}
                    >
                      {t('plans.essential')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      category.budgetCategory === 'nonEssential' && styles.budgetTypeButtonActive,
                      { borderColor: '#9C27B0' },
                      category.budgetCategory === 'nonEssential' && { backgroundColor: '#9C27B0' }
                    ]}
                    onPress={() => handleBudgetCategoryChange(
                      category.id,
                      category.budgetCategory === 'nonEssential' ? undefined : 'nonEssential'
                    )}
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        { color: category.budgetCategory === 'nonEssential' ? '#fff' : '#9C27B0' }
                      ]}
                    >
                      {t('plans.nonEssential')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Модалка добавления категории */}
      <AddCategoryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialType="expense"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetCategoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  budgetTypeButtonActive: {
    // Background color is set dynamically
  },
  budgetTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});