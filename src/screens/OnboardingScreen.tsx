import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useCurrency } from '../context/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
];

const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { colors } = useTheme();
  const { currentLanguage, setLanguage } = useLocalization();
  const { defaultCurrency, setDefaultCurrency } = useCurrency();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      title: getLocalizedText('Добро пожаловать в CASHCRAFT', 'Welcome to CASHCRAFT'),
      subtitle: getLocalizedText('Управляйте своими финансами легко и удобно', 'Manage your finances easily and conveniently'),
      content: 'welcome'
    },
    {
      title: getLocalizedText('Выберите язык', 'Choose Language'),
      subtitle: getLocalizedText('Выберите предпочитаемый язык интерфейса', 'Select your preferred interface language'),
      content: 'language'
    },
    {
      title: getLocalizedText('Выберите валюту', 'Choose Currency'),
      subtitle: getLocalizedText('Установите основную валюту для отображения', 'Set the main currency for display'),
      content: 'currency'
    }
  ];

  function getLocalizedText(ru: string, en: string): string {
    return selectedLanguage === 'ru' ? ru : en;
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      Animated.timing(slideAnim, {
        toValue: -(currentStep + 1) * screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      Animated.timing(slideAnim, {
        toValue: -(currentStep - 1) * screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Применяем выбранные настройки
      await setLanguage(selectedLanguage);
      await setDefaultCurrency(selectedCurrency);

      // Сохраняем флаг завершения onboarding
      await AsyncStorage.setItem('onboardingCompleted', 'true');

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      onComplete(); // Продолжаем даже если произошла ошибка
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        {
          backgroundColor: selectedLanguage === item.code ? colors.primary + '20' : colors.card,
          borderColor: selectedLanguage === item.code ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setSelectedLanguage(item.code as typeof currentLanguage)}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
      {selectedLanguage === item.code && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        {
          backgroundColor: selectedCurrency === item.code ? colors.primary + '20' : colors.card,
          borderColor: selectedCurrency === item.code ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setSelectedCurrency(item.code)}
    >
      <Text style={[styles.currencySymbol, { color: colors.primary }]}>{item.symbol}</Text>
      <View style={styles.currencyInfo}>
        <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
        <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
      </View>
      {selectedCurrency === item.code && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderStepContent = (step: typeof steps[0]) => {
    switch (step.content) {
      case 'welcome':
        return (
          <View style={styles.welcomeContent}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={[styles.welcomeIcon, { tintColor: colors.primary }]}
              resizeMode="contain"
            />
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              {getLocalizedText(
                'Настройте приложение под себя, выбрав язык и валюту',
                'Customize the app for yourself by choosing language and currency'
              )}
            </Text>
          </View>
        );
      case 'language':
        return (
          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'currency':
        return (
          <FlatList
            data={currencies}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.code}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                {
                  backgroundColor: index <= currentStep ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            transform: [{ translateX: slideAnim }],
            width: screenWidth * steps.length,
          },
        ]}
      >
        {steps.map((step, index) => (
          <View key={index} style={[styles.stepContainer, { width: screenWidth }]}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                {step.subtitle}
              </Text>
            </View>
            {renderStepContent(step)}
          </View>
        ))}
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: currentStep > 0 ? colors.card : 'transparent',
              opacity: currentStep > 0 ? 1 : 0,
            },
          ]}
          onPress={prevStep}
          disabled={currentStep === 0}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={nextStep}
        >
          <Text style={[styles.nextButtonText, { color: '#fff' }]}>
            {currentStep === steps.length - 1
              ? getLocalizedText('Начать', 'Get Started')
              : getLocalizedText('Далее', 'Next')}
          </Text>
          <Ionicons
            name={currentStep === steps.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepHeader: {
    marginBottom: 30,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  optionsList: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 12,
    width: 40,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    marginLeft: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});