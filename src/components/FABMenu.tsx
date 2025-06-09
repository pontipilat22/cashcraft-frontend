import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FABMenuProps {
  onIncomePress: () => void;
  onExpensePress: () => void;
  onDebtPress: () => void;
  onTransferPress?: () => void;
}

export const FABMenu: React.FC<FABMenuProps> = ({
  onIncomePress,
  onExpensePress,
  onDebtPress,
  onTransferPress,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(animationValue, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(toValue === 1);
    });
  };

  const handleOptionPress = (action: () => void) => {
    Animated.parallel([
      Animated.timing(animationValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      action();
    });
  };

  const handleClose = () => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsOpen(false);
      });
    }
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuItems = [
    {
      label: 'Расход',
      icon: 'remove-circle',
      color: '#FF5252',
      onPress: onExpensePress,
    },
    {
      label: 'Доход',
      icon: 'add-circle',
      color: '#4CAF50',
      onPress: onIncomePress,
    },
    {
      label: 'Долг',
      icon: 'people',
      color: '#FF9800',
      onPress: onDebtPress,
    },
  ];

  if (onTransferPress) {
    menuItems.splice(2, 0, {
      label: 'Перевод',
      icon: 'swap-horizontal',
      color: '#00BCD4',
      onPress: onTransferPress,
    });
  }

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      alignItems: 'flex-end',
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    menuContainer: {
      position: 'absolute',
      bottom: 70,
      right: 0,
      alignItems: 'flex-end',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    menuButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    menuLabel: {
      marginRight: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderRadius: 4,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    menuLabelText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  });

  return (
    <>
      {isOpen && (
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: animationValue,
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}
      
      <View style={styles.container}>
        {isOpen && (
          <Animated.View
            style={[
              styles.menuContainer,
              {
                opacity: animationValue,
                transform: [
                  {
                    translateY: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {menuItems.map((item, index) => (
              <Animated.View
                key={item.label}
                style={[
                  styles.menuItem,
                  {
                    opacity: animationValue,
                    transform: [
                      {
                        translateY: animationValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20 * (index + 1), 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.menuLabel}>
                  <Text style={styles.menuLabelText}>{item.label}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.menuButton, { backgroundColor: item.color }]}
                  onPress={() => handleOptionPress(item.onPress)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={item.icon as any} size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}
        
        <TouchableOpacity
          style={styles.fab}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}; 