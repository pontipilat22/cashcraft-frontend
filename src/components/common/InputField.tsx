import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { modalStyles } from '../../styles/modalStyles';

interface InputFieldProps extends TextInputProps {
  label?: string;
  showError?: boolean;
  errorMessage?: string;
}

/**
 * Компонент текстового поля с label и validation
 */
export const InputField: React.FC<InputFieldProps> = ({
  label,
  showError = false,
  errorMessage,
  ...textInputProps
}) => {
  const { colors } = useTheme();

  return (
    <View style={modalStyles.inputContainer}>
      {label && (
        <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          modalStyles.input,
          {
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: showError ? '#FF4444' : colors.border,
          }
        ]}
        placeholderTextColor={colors.textSecondary}
        {...textInputProps}
      />
      {showError && errorMessage && (
        <Text style={modalStyles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};
