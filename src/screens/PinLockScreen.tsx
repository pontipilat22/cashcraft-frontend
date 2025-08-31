import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { pinService } from '../services/pinService';
import { useAuth } from '../context/AuthContext';

interface PinLockScreenProps {
  onSuccess: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onSuccess }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { logout } = useAuth();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkLockoutStatus();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            checkLockoutStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTime]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App coming to foreground
      checkLockoutStatus();
    }
    appState.current = nextAppState;
  };

  const checkLockoutStatus = async () => {
    const lockout = await pinService.isLockedOut();
    if (lockout.locked && lockout.remainingTime) {
      setLockoutTime(lockout.remainingTime);
    } else {
      setLockoutTime(0);
      const attempts = await pinService.getRemainingAttempts();
      setRemainingAttempts(attempts);
    }
  };

  const handleNumberPress = (num: string) => {
    if (lockoutTime > 0) return;
    
    setError('');
    
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (lockoutTime > 0) return;
    setError('');
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      const isValid = await pinService.verifyPin(enteredPin);
      
      if (isValid) {
        onSuccess();
      } else {
        const attempts = await pinService.getRemainingAttempts();
        setRemainingAttempts(attempts);
        
        if (attempts > 0) {
          showError(t('pin.incorrectPin') + ` (${attempts} ${t('pin.attemptsRemaining')})`);
        } else {
          checkLockoutStatus();
        }
        
        setPin('');
      }
    } catch (error: any) {
      if (error.message === 'TOO_MANY_ATTEMPTS') {
        checkLockoutStatus();
      } else {
        showError(t('pin.error'));
      }
      setPin('');
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

  const handleForgotPin = () => {
    Alert.alert(
      t('pin.forgotTitle'),
      t('pin.forgotMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          style: 'destructive',
          onPress: async () => {
            await pinService.disablePin();
            logout();
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t('pin.enterPin')}
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
                  backgroundColor: pin.length > index 
                    ? colors.primary 
                    : colors.border,
                  borderColor: colors.border,
                }
              ]}
            />
          ))}
        </Animated.View>

        {lockoutTime > 0 ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {t('pin.lockedOut')} {formatTime(lockoutTime)}
          </Text>
        ) : error ? (
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
                { 
                  backgroundColor: isDark ? colors.card : colors.background,
                  opacity: lockoutTime > 0 ? 0.5 : 1,
                }
              ]}
              onPress={() => handleNumberPress(num.toString())}
              activeOpacity={0.7}
              disabled={lockoutTime > 0}
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
              { 
                backgroundColor: isDark ? colors.card : colors.background,
                opacity: lockoutTime > 0 ? 0.5 : 1,
              }
            ]}
            onPress={() => handleNumberPress('0')}
            activeOpacity={0.7}
            disabled={lockoutTime > 0}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>
              0
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.key,
              { 
                backgroundColor: isDark ? colors.card : colors.background,
                opacity: lockoutTime > 0 ? 0.5 : 1,
              }
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={lockoutTime > 0}
          >
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPin}
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>
            {t('pin.forgot')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    marginBottom: 40,
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
  forgotButton: {
    marginTop: 30,
    padding: 10,
  },
  forgotText: {
    fontSize: 16,
  },
});