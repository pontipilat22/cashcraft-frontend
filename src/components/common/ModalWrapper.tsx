import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { modalStyles } from '../../styles/modalStyles';

interface ModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showScrollView?: boolean;
  headerIcon?: string;
}

/**
 * Базовый компонент модального окна
 * Используется как обертка для всех модальных окон в приложении
 */
export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  showScrollView = true,
  headerIcon,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modalStyles.modalContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[modalStyles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={modalStyles.header}>
            {headerIcon && (
              <View style={[modalStyles.iconCircle, { backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, marginRight: 12 }]}>
                <Ionicons name={headerIcon as any} size={18} color="#fff" />
              </View>
            )}
            <Text style={[modalStyles.title, { color: colors.text, flex: 1 }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {showScrollView ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}

          {/* Footer */}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
