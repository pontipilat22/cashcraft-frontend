import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { Account } from '../types';

interface AccountCardProps {
  account: Account;
  onPress: () => void;
  onLongPress?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    // Добавляем вибрацию для обратной связи
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    
    // Вызываем колбэк для долгого нажатия
    if (onLongPress) {
      onLongPress();
    }
  };

  const getHighlightColor = () => {
    if (!isPressed) return colors.card;
    
    // Для светлой темы делаем карточку темнее, для темной - светлее
    if (isDark) {
      return colors.primary + '30'; // Добавляем прозрачность к основному цвету
    } else {
      return colors.primary + '20'; // Более прозрачный для светлой темы
    }
  };

  const getIcon = () => {
    if (account.type === 'savings' && account.icon) {
      return account.icon as keyof typeof Ionicons.glyphMap;
    }
    
    switch (account.type) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'savings':
        return 'trending-up-outline';
      case 'debt':
        return 'arrow-down-circle-outline';
      case 'credit':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgress = () => {
    if (account.type !== 'savings' || !account.targetAmount) return 0;
    return Math.min((account.balance / account.targetAmount) * 100, 100);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[
          styles.container, 
          {
            backgroundColor: isDark ? '#232323' : '#fff',
            borderWidth: isPressed ? 1 : 0,
            borderColor: isPressed ? colors.primary : 'transparent',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}> 
            <Ionicons name={getIcon()} size={24} color="#fff" />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#232323' }]} numberOfLines={1}>
              {account.name}
            </Text>
            {account.type === 'card' && account.cardNumber && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
                {account.cardNumber}
              </Text>
            )}
          </View>
          <Text style={[styles.balance, { color: isDark ? '#fff' : '#232323' }]}> 
            {formatBalance(account.balance)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18, // большее скругление
    paddingVertical: 14, // чуть меньше padding
    paddingHorizontal: 16,
    marginBottom: 12,
    marginHorizontal: 12, // чуть меньше отступы
    // maxWidth убираем
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  balance: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  defaultIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
}); 