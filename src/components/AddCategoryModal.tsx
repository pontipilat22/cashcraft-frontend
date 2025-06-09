import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface AddCategoryModalProps {
  visible: boolean;
  type: 'income' | 'expense';
  onClose: () => void;
}

// Доступные иконки для категорий
const availableIcons = [
  // Общие
  'cash-outline',
  'card-outline',
  'wallet-outline',
  'trending-up-outline',
  'trending-down-outline',
  'receipt-outline',
  'calculator-outline',
  'briefcase-outline',
  
  // Еда и покупки
  'cart-outline',
  'restaurant-outline',
  'cafe-outline',
  'fast-food-outline',
  'pizza-outline',
  'wine-outline',
  'beer-outline',
  'basket-outline',
  'bag-outline',
  'gift-outline',
  
  // Транспорт
  'car-outline',
  'bus-outline',
  'train-outline',
  'airplane-outline',
  'bicycle-outline',
  'speedometer-outline',
  'subway-outline',
  
  // Дом и быт
  'home-outline',
  'bed-outline',
  'bulb-outline',
  'water-outline',
  'build-outline',
  'construct-outline',
  'hammer-outline',
  'color-palette-outline',
  
  // Развлечения
  'game-controller-outline',
  'musical-notes-outline',
  'film-outline',
  'tv-outline',
  'book-outline',
  'library-outline',
  'camera-outline',
  'image-outline',
  
  // Здоровье и спорт
  'fitness-outline',
  'medkit-outline',
  'heart-outline',
  'pulse-outline',
  'medical-outline',
  'barbell-outline',
  'football-outline',
  'basketball-outline',
  
  // Связь и технологии
  'phone-portrait-outline',
  'laptop-outline',
  'desktop-outline',
  'wifi-outline',
  'cloud-outline',
  'globe-outline',
  'mail-outline',
  'chatbubble-outline',
  
  // Другое
  'school-outline',
  'people-outline',
  'person-outline',
  'paw-outline',
  'shirt-outline',
  'cut-outline',
  'flower-outline',
  'star-outline',
  'heart-outline',
  'add-circle-outline',
  'ellipsis-horizontal-outline',
];

// Цвета для категорий
const availableColors = [
  '#F44336', // red
  '#E91E63', // pink
  '#9C27B0', // purple
  '#673AB7', // deep purple
  '#3F51B5', // indigo
  '#2196F3', // blue
  '#03A9F4', // light blue
  '#00BCD4', // cyan
  '#009688', // teal
  '#4CAF50', // green
  '#8BC34A', // light green
  '#CDDC39', // lime
  '#FFEB3B', // yellow
  '#FFC107', // amber
  '#FF9800', // orange
  '#FF5722', // deep orange
  '#795548', // brown
  '#607D8B', // blue grey
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  type,
  onClose,
}) => {
  const { colors } = useTheme();
  const { createCategory } = useData();
  
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cash-outline');
  const [selectedColor, setSelectedColor] = useState('#F44336');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await createCategory({
        name: name.trim(),
        type,
        icon: selectedIcon,
        color: selectedColor,
      });
      
      // Очищаем форму
      setName('');
      setSelectedIcon('cash-outline');
      setSelectedColor('#F44336');
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleClose = () => {
    // Очищаем форму при закрытии
    setName('');
    setSelectedIcon('cash-outline');
    setSelectedColor('#F44336');
    setShowIconPicker(false);
    setShowColorPicker(false);
    onClose();
  };

  const renderIcon = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        { backgroundColor: colors.background },
        selectedIcon === item && { backgroundColor: colors.primary + '20' },
      ]}
      onPress={() => {
        setSelectedIcon(item);
        setShowIconPicker(false);
      }}
    >
      <Ionicons name={item as any} size={24} color={selectedIcon === item ? colors.primary : colors.text} />
    </TouchableOpacity>
  );

  const renderColor = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorItem,
        { backgroundColor: item },
        selectedColor === item && styles.selectedColorItem,
      ]}
      onPress={() => {
        setSelectedColor(item);
        setShowColorPicker(false);
      }}
    >
      {selectedColor === item && (
        <Ionicons name="checkmark" size={20} color="#fff" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Новая категория {type === 'income' ? 'доходов' : 'расходов'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Превью категории */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
                <Ionicons name={selectedIcon as any} size={32} color={selectedColor} />
              </View>
              <Text style={[styles.previewName, { color: colors.text }]}>
                {name || 'Название категории'}
              </Text>
            </View>

            {/* Название */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Название</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={name}
                onChangeText={setName}
                placeholder="Введите название"
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
              />
            </View>

            {/* Иконка */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Иконка</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowIconPicker(true)}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name={selectedIcon as any} size={24} color={colors.text} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    Выбрать иконку
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Цвет */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Цвет</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowColorPicker(true)}
              >
                <View style={styles.selectorContent}>
                  <View style={[styles.colorPreview, { backgroundColor: selectedColor }]}></View>
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    Выбрать цвет
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>Создать</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Модальное окно выбора иконки */}
      <Modal
        visible={showIconPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIconPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowIconPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите иконку
            </Text>
            <FlatList
              data={availableIcons}
              renderItem={renderIcon}
              keyExtractor={(item) => item}
              numColumns={6}
              contentContainerStyle={styles.iconGrid}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно выбора цвета */}
      <Modal
        visible={showColorPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.pickerContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Выберите цвет
            </Text>
            <FlatList
              data={availableColors}
              renderItem={renderColor}
              keyExtractor={(item) => item}
              numColumns={6}
              contentContainerStyle={styles.colorGrid}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selector: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    marginLeft: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  iconGrid: {
    paddingVertical: 8,
  },
  iconItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  colorGrid: {
    paddingVertical: 8,
  },
  colorItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorItem: {
    borderWidth: 2,
    borderColor: '#fff',
  },
}); 