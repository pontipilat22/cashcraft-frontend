import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useNavigation } from '@react-navigation/native';

export const PrivacyPolicyScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();

  const privacyContent = {
    ru: {
      title: 'Политика конфиденциальности',
      lastUpdated: 'Последнее обновление: 15 сентября 2025 г.',
      sections: [
        {
          title: '1. Введение',
          content: 'Настоящая Политика конфиденциальности описывает, как мобильное приложение Cashcraft ("мы", "наше приложение") собирает, использует и защищает вашу персональную информацию при использовании нашего сервиса.'
        },
        {
          title: '2. Какую информацию мы собираем',
          content: 'Мы можем собирать следующие типы информации:\n\n• Информация аккаунта: электронная почта, имя (при регистрации через Google)\n• Финансовые данные: информация о доходах, расходах, счетах, которую вы вводите самостоятельно\n• Техническая информация: версия приложения, операционная система, уникальный идентификатор устройства\n• Данные использования: как вы взаимодействуете с приложением'
        },
        {
          title: '3. Как мы используем вашу информацию',
          content: 'Мы используем собранную информацию для:\n\n• Предоставления и улучшения функций приложения\n• Синхронизации ваших данных между устройствами\n• Обеспечения безопасности вашего аккаунта\n• Отправки важных уведомлений о сервисе\n• Анализа использования для улучшения приложения'
        },
        {
          title: '4. Где хранятся ваши данные',
          content: 'Ваши данные хранятся:\n\n• Локально на вашем устройстве в зашифрованной базе данных SQLite\n• На защищенных серверах Google Firebase (для синхронизации и резервного копирования)\n• Все данные передаются по защищенному соединению HTTPS'
        },
        {
          title: '5. Безопасность данных',
          content: 'Мы применяем современные меры безопасности:\n\n• Шифрование данных при хранении и передаче\n• Регулярные обновления безопасности\n• Ограниченный доступ к серверам\n• Мониторинг подозрительной активности\n• Соблюдение стандартов безопасности Google Firebase'
        },
        {
          title: '6. Обмен информацией с третьими лицами',
          content: 'Мы НЕ продаем, НЕ обмениваем и НЕ передаем ваши персональные данные третьим лицам, за исключением:\n\n• Требований законодательства\n• Защиты наших прав и безопасности\n• Поставщиков технических услуг (Google Firebase) с соответствующими соглашениями о конфиденциальности'
        },
        {
          title: '7. Контактная информация',
          content: 'Если у вас есть вопросы о данной Политике конфиденциальности или обработке ваших данных, свяжитесь с нами:\n\nEmail: privacy@cashcraft.app\nПоддержка: support@cashcraft.app'
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: September 15, 2025',
      sections: [
        {
          title: '1. Introduction',
          content: 'This Privacy Policy describes how the Cashcraft mobile application ("we", "our app") collects, uses and protects your personal information when you use our service.'
        },
        {
          title: '2. What Information We Collect',
          content: 'We may collect the following types of information:\n\n• Account information: email, name (when registering via Google)\n• Financial data: income, expense, account information that you enter yourself\n• Technical information: app version, operating system, unique device identifier\n• Usage data: how you interact with the application'
        },
        {
          title: '3. How We Use Your Information',
          content: 'We use the collected information to:\n\n• Provide and improve application features\n• Sync your data across devices\n• Ensure the security of your account\n• Send important service notifications\n• Analyze usage to improve the application'
        },
        {
          title: '4. Where Your Data is Stored',
          content: 'Your data is stored:\n\n• Locally on your device in an encrypted SQLite database\n• On secure Google Firebase servers (for sync and backup)\n• All data is transmitted over secure HTTPS connection'
        },
        {
          title: '5. Data Security',
          content: 'We apply modern security measures:\n\n• Data encryption in storage and transmission\n• Regular security updates\n• Limited server access\n• Monitoring for suspicious activity\n• Compliance with Google Firebase security standards'
        },
        {
          title: '6. Information Sharing with Third Parties',
          content: 'We do NOT sell, trade or transfer your personal data to third parties, except for:\n\n• Legal requirements\n• Protecting our rights and security\n• Technical service providers (Google Firebase) with appropriate confidentiality agreements'
        },
        {
          title: '7. Contact Information',
          content: 'If you have questions about this Privacy Policy or the processing of your data, contact us:\n\nEmail: privacy@cashcraft.app\nSupport: support@cashcraft.app'
        }
      ]
    }
  };

  const getCurrentContent = () => {
    const locale = t('navigation.transactions') === 'Транзакции' ? 'ru' : 'en';
    return privacyContent[locale] || privacyContent.en;
  };

  const content = getCurrentContent();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {content.title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {content.lastUpdated}
          </Text>

          {content.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                {section.content}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
}); 