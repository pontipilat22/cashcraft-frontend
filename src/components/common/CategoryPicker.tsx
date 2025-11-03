import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useData } from '../../context/DataContext';
import { getLocalizedCategory } from '../../utils/categoryUtils';
import { modalStyles } from '../../styles/modalStyles';

interface CategoryPickerProps {
  label?: string;
  value?: string; // category id
  onChange: (categoryId: string) => void;
  type?: 'income' | 'expense';
  showError?: boolean;
  errorMessage?: string;
  placeholder?: string;
  onAddCategory?: () => void;
}

/**
 * Компонент для выбора категории
 */
export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  label,
  value,
  onChange,
  type,
  showError = false,
  errorMessage,
  placeholder,
  onAddCategory,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { categories } = useData();
  const [showPicker, setShowPicker] = useState(false);

  const filteredCategories = type
    ? categories.filter(cat => cat.type === type)
    : categories;

  const selectedCategory = categories.find(cat => cat.id === value);
  const localizedCategory = selectedCategory ? getLocalizedCategory(selectedCategory, t) : null;

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setShowPicker(false);
  };

  const handleAddCategory = () => {
    setShowPicker(false);
    onAddCategory?.();
  };

  return (
    <>
      <View style={styles.container}>
        {label && (
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
        )}
        <TouchableOpacity
          style={[
            modalStyles.selector,
            {
              backgroundColor: colors.background,
              borderColor: showError ? '#FF4444' : colors.border,
            }
          ]}
          onPress={() => setShowPicker(true)}
        >
          <View style={modalStyles.selectorContent}>
            {selectedCategory && (
              <View style={[
                modalStyles.categoryIconSmall,
                { backgroundColor: selectedCategory.color + '20' }
              ]}>
                <Ionicons
                  name={selectedCategory.icon as any}
                  size={16}
                  color={selectedCategory.color}
                />
              </View>
            )}
            <Text style={[
              modalStyles.selectorText,
              { color: selectedCategory ? colors.text : colors.textSecondary }
            ]}>
              {localizedCategory?.name || placeholder || t('transactions.selectCategory')}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {showError && errorMessage && (
          <Text style={modalStyles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.pickerHeader}>
              <Text style={[modalStyles.pickerTitle, { color: colors.text }]}>
                {label || t('transactions.selectCategory')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={modalStyles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {filteredCategories.map(category => {
                const localizedCat = getLocalizedCategory(category, t);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[modalStyles.categoryPickerItem, { backgroundColor: colors.background }]}
                    onPress={() => handleSelect(category.id)}
                  >
                    <View style={[
                      modalStyles.categoryIcon,
                      { backgroundColor: category.color + '20' }
                    ]}>
                      <Ionicons name={category.icon as any} size={20} color={category.color} />
                    </View>
                    <Text style={[modalStyles.pickerItemText, { color: colors.text }]}>
                      {localizedCat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Category Button */}
              {onAddCategory && (
                <TouchableOpacity
                  style={[
                    modalStyles.categoryPickerItem,
                    {
                      backgroundColor: colors.background,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      marginTop: 8,
                    }
                  ]}
                  onPress={handleAddCategory}
                >
                  <View style={[
                    modalStyles.categoryIcon,
                    { backgroundColor: colors.primary + '20' }
                  ]}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </View>
                  <Text style={[
                    modalStyles.pickerItemText,
                    { color: colors.primary, fontWeight: '600' }
                  ]}>
                    {t('categories.addCategory')}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
