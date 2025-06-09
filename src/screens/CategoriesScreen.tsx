import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Category } from '../types';
import { AddCategoryModal } from '../components/AddCategoryModal';

export const CategoriesScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { categories, deleteCategory } = useData();
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredCategories = categories.filter(cat => cat.type === selectedType);

  const handleDeleteCategory = (category: Category) => {
    // Проверяем, что это не базовая категория "Другое"
    if (category.id === 'other_income' || category.id === 'other_expense') {
      Alert.alert(
        'Невозможно удалить',
        'Базовую категорию "Другое" нельзя удалить'
      );
      return;
    }

    Alert.alert(
      'Удалить категорию?',
      `Все транзакции категории "${category.name}" будут перемещены в "Другое"`,
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
              await deleteCategory(category.id);
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Ошибка', 'Не удалось удалить категорию');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Переключатель типа */}
      <View style={[styles.typeSwitch, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'expense' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedType('expense')}
        >
          <Text style={[
            styles.typeButtonText,
            { color: selectedType === 'expense' ? '#fff' : colors.text }
          ]}>
            Расходы
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'income' && { backgroundColor: '#4CAF50' },
          ]}
          onPress={() => setSelectedType('income')}
        >
          <Text style={[
            styles.typeButtonText,
            { color: selectedType === 'income' ? '#fff' : colors.text }
          ]}>
            Доходы
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesGrid}>
          {filteredCategories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryItem, { backgroundColor: colors.card }]}
              onLongPress={() => handleDeleteCategory(category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon as any} size={28} color={category.color} />
              </View>
              <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                {category.name}
              </Text>
              {(category.id !== 'other_income' && category.id !== 'other_expense') && (
                <View style={styles.deleteHint}>
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
          {/* Кнопка добавления */}
          <TouchableOpacity
            style={[styles.categoryItem, styles.addButton, { backgroundColor: colors.card }]}
            onPress={() => setShowAddModal(true)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.categoryName, { color: colors.primary }]}>
              Добавить
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={showAddModal}
        type={selectedType}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  typeSwitch: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryItem: {
    width: '31.33%',
    aspectRatio: 1,
    padding: 8,
    margin: '1%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    textAlign: 'center',
  },
  deleteHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    opacity: 0.5,
  },
  addButton: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'transparent',
  },
}); 