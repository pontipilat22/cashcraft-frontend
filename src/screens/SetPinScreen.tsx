import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { pinService } from '../services/pinService';
import { useNavigation } from '@react-navigation/native';

interface SetPinScreenProps {
  route?: {
    params?: {
      isChangingPin?: boolean;
    };
  };
}

export const SetPinScreen: React.FC<SetPinScreenProps> = ({ route }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const isChangingPin = route?.params?.isChangingPin || false;

  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(
    isChangingPin ? 'current' : 'new'
  );
  const [error, setError] = useState('');

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleNumberPress = (num: string) => {
    setError('');
    
    if (step === 'current' && currentPin.length < 4) {
      const newPin = currentPin + num;
      setCurrentPin(newPin);
      
      if (newPin.length === 4) {
        validateCurrentPin(newPin);
      }
    } else if (step === 'new' && pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          setStep('confirm');
        }, 300);
      }
    } else if (step === 'confirm' && confirmPin.length < 4) {
      const newConfirmPin = confirmPin + num;
      setConfirmPin(newConfirmPin);
      
      if (newConfirmPin.length === 4) {
        validatePins(pin, newConfirmPin);
      }
    }
  };

  const handleDelete = () => {
    setError('');
    
    if (step === 'current') {
      setCurrentPin(currentPin.slice(0, -1));
    } else if (step === 'new') {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const validateCurrentPin = async (enteredPin: string) => {
    try {
      const isValid = await pinService.verifyPin(enteredPin);
      if (isValid) {
        setStep('new');
        setCurrentPin('');
      } else {
        showError(t('pin.incorrectPin'));
        setCurrentPin('');
      }
    } catch (error: any) {
      if (error.message === 'TOO_MANY_ATTEMPTS') {
        showError(t('pin.tooManyAttempts'));
      } else {
        showError(t('pin.error'));
      }
      setCurrentPin('');
    }
  };

  const validatePins = async (pin1: string, pin2: string) => {
    if (pin1 !== pin2) {
      showError(t('pin.mismatch'));
      setPin('');
      setConfirmPin('');
      setStep('new');
      return;
    }

    try {
      if (isChangingPin) {
        await pinService.setPin(pin1);
        Alert.alert(t('common.success'), t('pin.changed'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() }
        ]);
      } else {
        await pinService.setPin(pin1);
        Alert.alert(t('common.success'), t('pin.set'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      showError(t('pin.error'));
    }
  };

  const showError = (message: string) => {
    setError(message);
    Vibration.vibrate(50);
    
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getActivePin = () => {
    if (step === 'current') return currentPin;
    if (step === 'new') return pin;
    return confirmPin;
  };

  const getTitle = () => {
    if (step === 'current') return t('pin.enterCurrent');
    if (step === 'new') return t('pin.enterNew');
    return t('pin.confirmNew');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isChangingPin ? t('pin.changeTitle') : t('pin.setTitle')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {getTitle()}
        </Text>

        <Animated.View
          style={[
            styles.pinContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.pinDot,
                { 
                  backgroundColor: getActivePin().length > index 
                    ? colors.primary 
                    : colors.border,
                  borderColor: colors.border,
                }
              ]}
            />
          ))}
        </Animated.View>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {error}
          </Text>
        ) : null}

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.key,
                { backgroundColor: isDark ? colors.card : colors.background }
              ]}
              onPress={() => handleNumberPress(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: colors.text }]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
          
          <View style={styles.key} />
          
          <TouchableOpacity
            style={[
              styles.key,
              { backgroundColor: isDark ? colors.card : colors.background }
            ]}
            onPress={() => handleNumberPress('0')}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>
              0
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.key,
              { backgroundColor: isDark ? colors.card : colors.background }
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 10,
    borderWidth: 2,
  },
  error: {
    fontSize: 14,
    marginBottom: 20,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    justifyContent: 'center',
  },
  key: {
    width: 80,
    height: 80,
    margin: 10,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
  },
});