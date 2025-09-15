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

export const TermsOfServiceScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();

  const termsContent = {
    ru: {
      title: 'Пользовательское соглашение',
      lastUpdated: 'Последнее обновление: 15 сентября 2025 г.',
      sections: [
        {
          title: '1. Принятие условий',
          content: 'Используя мобильное приложение Cashcraft ("Приложение"), вы соглашаетесь соблюдать настоящие Условия обслуживания ("Условия"). Если вы не согласны с этими условиями, пожалуйста, не используйте Приложение.'
        },
        {
          title: '2. Описание сервиса',
          content: 'Cashcraft - это мобильное приложение для управления личными финансами, которое позволяет пользователям отслеживать доходы, расходы, управлять счетами, устанавливать финансовые цели и анализировать свои финансовые привычки.'
        },
        {
          title: '3. Регистрация аккаунта',
          content: 'Для использования некоторых функций Приложения может потребоваться создание учетной записи. Вы несете ответственность за обеспечение безопасности вашей учетной записи и пароля. Вы согласны предоставлять точную и актуальную информацию при регистрации.'
        },
        {
          title: '4. Использование приложения',
          content: 'Вы соглашаетесь использовать Приложение только в законных целях и в соответствии с настоящими Условиями. Запрещается:\n\n• Использовать Приложение для незаконных или мошеннических целей\n• Пытаться получить несанкционированный доступ к системам Приложения\n• Нарушать права интеллектуальной собственности\n• Передавать вирусы или вредоносное ПО'
        },
        {
          title: '5. Конфиденциальность данных',
          content: 'Мы серьезно относимся к защите ваших персональных данных. Сбор, использование и защита ваших данных регулируется нашей Политикой конфиденциальности, которая является частью настоящих Условий.'
        },
        {
          title: '6. Финансовые данные',
          content: 'Приложение предназначено для личного отслеживания финансов. Мы не предоставляем финансовых консультаций. Информация в Приложении предназначена только для информационных целей и не должна рассматриваться как профессиональный финансовый совет.'
        },
        {
          title: '7. Подписка и платежи',
          content: 'Некоторые функции Приложения могут требовать платной подписки. Условия подписки, включая стоимость и период действия, будут четко указаны перед покупкой. Подписка автоматически продлевается, если не отменена.'
        },
        {
          title: '8. Интеллектуальная собственность',
          content: 'Все права на Приложение, включая программное обеспечение, дизайн, содержимое и торговые марки, принадлежат разработчику. Вам предоставляется ограниченная, неисключительная лицензия на использование Приложения.'
        },
        {
          title: '9. Ограничение ответственности',
          content: 'Приложение предоставляется "как есть" без каких-либо гарантий. Мы не несем ответственности за любые прямые, косвенные или случайные убытки, возникающие в результате использования Приложения.'
        },
        {
          title: '10. Изменения условий',
          content: 'Мы оставляем за собой право изменять эти Условия в любое время. О существенных изменениях мы уведомим пользователей через Приложение или по электронной почте. Продолжение использования Приложения после изменений означает принятие новых условий.'
        },
        {
          title: '11. Прекращение использования',
          content: 'Мы можем прекратить или приостановить ваш доступ к Приложению в случае нарушения настоящих Условий. Вы можете прекратить использование Приложения в любое время, удалив его с вашего устройства.'
        },
        {
          title: '12. Контактная информация',
          content: 'Если у вас есть вопросы относительно настоящих Условий обслуживания, пожалуйста, свяжитесь с нами:\n\nEmail: support@cashcraft.app\nВеб-сайт: www.cashcraft.app'
        }
      ]
    },
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last updated: September 15, 2025',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By using the Cashcraft mobile application ("Application"), you agree to comply with these Terms of Service ("Terms"). If you do not agree to these terms, please do not use the Application.'
        },
        {
          title: '2. Service Description',
          content: 'Cashcraft is a personal finance management mobile application that allows users to track income, expenses, manage accounts, set financial goals, and analyze their financial habits.'
        },
        {
          title: '3. Account Registration',
          content: 'Some features of the Application may require creating an account. You are responsible for maintaining the security of your account and password. You agree to provide accurate and current information during registration.'
        },
        {
          title: '4. Application Usage',
          content: 'You agree to use the Application only for lawful purposes and in accordance with these Terms. It is prohibited to:\n\n• Use the Application for illegal or fraudulent purposes\n• Attempt to gain unauthorized access to Application systems\n• Violate intellectual property rights\n• Transmit viruses or malicious software'
        },
        {
          title: '5. Data Privacy',
          content: 'We take the protection of your personal data seriously. The collection, use and protection of your data is governed by our Privacy Policy, which is part of these Terms.'
        },
        {
          title: '6. Financial Data',
          content: 'The Application is intended for personal financial tracking. We do not provide financial advice. Information in the Application is for informational purposes only and should not be considered professional financial advice.'
        },
        {
          title: '7. Subscription and Payments',
          content: 'Some Application features may require a paid subscription. Subscription terms, including cost and duration, will be clearly stated before purchase. Subscriptions automatically renew unless cancelled.'
        },
        {
          title: '8. Intellectual Property',
          content: 'All rights to the Application, including software, design, content and trademarks, belong to the developer. You are granted a limited, non-exclusive license to use the Application.'
        },
        {
          title: '9. Limitation of Liability',
          content: 'The Application is provided "as is" without any warranties. We are not liable for any direct, indirect or incidental damages arising from the use of the Application.'
        },
        {
          title: '10. Changes to Terms',
          content: 'We reserve the right to modify these Terms at any time. We will notify users of significant changes through the Application or email. Continued use of the Application after changes constitutes acceptance of the new terms.'
        },
        {
          title: '11. Termination',
          content: 'We may terminate or suspend your access to the Application in case of violation of these Terms. You may stop using the Application at any time by deleting it from your device.'
        },
        {
          title: '12. Contact Information',
          content: 'If you have questions regarding these Terms of Service, please contact us:\n\nEmail: support@cashcraft.app\nWebsite: www.cashcraft.app'
        }
      ]
    }
  };

  const getCurrentContent = () => {
    const locale = t('navigation.transactions') === 'Транзакции' ? 'ru' : 'en';
    return termsContent[locale] || termsContent.en;
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