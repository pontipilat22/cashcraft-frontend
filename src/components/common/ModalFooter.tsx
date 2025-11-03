import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLocalization } from '../../context/LocalizationContext';
import { modalStyles } from '../../styles/modalStyles';

interface ModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  cancelText?: string;
  saveText?: string;
  saveDisabled?: boolean;
  saveColor?: string;
}

/**
 * Футер модального окна с кнопками Cancel и Save
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onSave,
  cancelText,
  saveText,
  saveDisabled = false,
  saveColor,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <View style={modalStyles.footer}>
      <TouchableOpacity
        style={[modalStyles.button, modalStyles.cancelButton, { borderColor: colors.border }]}
        onPress={onCancel}
      >
        <Text style={[modalStyles.buttonText, { color: colors.text }]}>
          {cancelText || t('common.cancel')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          modalStyles.button,
          modalStyles.saveButton,
          { backgroundColor: saveColor || colors.primary },
          saveDisabled && { opacity: 0.5 }
        ]}
        onPress={onSave}
        disabled={saveDisabled}
      >
        <Text style={[modalStyles.buttonText, { color: '#fff' }]}>
          {saveText || t('common.save')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
