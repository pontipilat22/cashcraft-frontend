import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface LiquidGlassTabBarProps extends BottomTabBarProps {
  onFABPress?: () => void;
}

export const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onFABPress,
}) => {
  const { colors, isDark } = useTheme();
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);

  const handleFABPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    fabRotation.value = withSpring(fabRotation.value + 90, {
      damping: 10,
      stiffness: 100,
    });

    if (onFABPress) {
      onFABPress();
    }
  };

  const handleFABPressIn = () => {
    fabScale.value = withTiming(0.9, { duration: 100 });
  };

  const handleFABPressOut = () => {
    fabScale.value = withSpring(1, {
      damping: 10,
      stiffness: 200,
    });
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value}deg` },
    ],
  }));

  const midPoint = Math.floor(state.routes.length / 2);

  // Проверяем, нужно ли скрыть tab bar (ПОСЛЕ всех хуков!)
  const currentRoute = state.routes[state.index];
  const { options } = descriptors[currentRoute.key];
  const tabBarStyle = options.tabBarStyle;

  // Если tabBarStyle содержит display: 'none', скрываем tab bar
  if (tabBarStyle && typeof tabBarStyle === 'object' && 'display' in tabBarStyle) {
    if (tabBarStyle.display === 'none') {
      return null; // Теперь безопасно делать return null - все хуки уже вызваны
    }
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, {
        backgroundColor: isDark ? '#232323' : colors.card,
      }]}>
        {state.routes.map((route, index) => {
          // Вставляем FAB кнопку в центр
          if (index === midPoint) {
            return (
              <React.Fragment key={`fab-${index}`}>
                <AnimatedTouchable
                  onPress={handleFABPress}
                  onPressIn={handleFABPressIn}
                  onPressOut={handleFABPressOut}
                  style={[styles.fabButton, fabAnimatedStyle]}
                >
                  <LinearGradient
                    colors={isDark ? ['#FF8C00', '#FF6800'] : ['#5A9FFF', '#4287f5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                  >
                    <Ionicons name="add" size={36} color="#FFFFFF" />
                  </LinearGradient>
                </AnimatedTouchable>
                {renderTabButton(route, index, state, descriptors, navigation, colors, isDark)}
              </React.Fragment>
            );
          }

          return renderTabButton(route, index, state, descriptors, navigation, colors, isDark);
        })}
      </View>
    </View>
  );
};

function renderTabButton(
  route: any,
  index: number,
  state: any,
  descriptors: any,
  navigation: any,
  colors: any,
  isDark: boolean
) {
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel !== undefined
    ? options.tabBarLabel
    : options.title !== undefined
    ? options.title
    : route.name;

  const isFocused = state.index === index;

  const onPress = () => {
    // Haptic feedback при нажатии
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onLongPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <TabBarButton
      key={route.key}
      isFocused={isFocused}
      options={options}
      onPress={onPress}
      onLongPress={onLongPress}
      label={String(label)}
      colors={colors}
      isDark={isDark}
    />
  );
}

interface TabBarButtonProps {
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
  colors: any;
  isDark: boolean;
}

const TabBarButton: React.FC<TabBarButtonProps> = ({
  isFocused,
  options,
  onPress,
  onLongPress,
  label,
  colors,
  isDark,
}) => {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  React.useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 12,
      stiffness: 180,
    });
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withTiming(0.85, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 200,
    });
  };

  return (
    <AnimatedTouchable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tab, animatedButtonStyle]}
    >
      <View style={styles.tabContent}>
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          {options.tabBarIcon({
            focused: isFocused,
            color: isFocused ? colors.tabBarActive : colors.tabBarInactive,
            size: 26,
          })}
        </Animated.View>
        <Animated.Text
          style={[
            styles.label,
            {
              color: isFocused ? colors.tabBarActive : colors.tabBarInactive,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
        >
          {label}
        </Animated.Text>
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    overflow: 'visible',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  container: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 82 : 74,
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 28,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -8,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    top: -4,
  },
  iconContainer: {
    marginBottom: 2,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});
