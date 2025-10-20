import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Хук для скрытия нижней навигации (tab bar) на текущем экране
 * Автоматически показывает tab bar обратно при размонтировании экрана
 */
export const useHideTabBar = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Получаем родительский навигатор (Bottom Tab Navigator)
    const parent = navigation.getParent();

    if (parent) {
      // Скрываем tab bar
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }

    // Cleanup: показываем tab bar обратно при размонтировании
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined
        });
      }
    };
  }, [navigation]);
};
