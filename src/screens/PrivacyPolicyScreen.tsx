import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyScreenProps {
  navigation: any;
}

// Английские переводы как fallback
const privacyFallback = {
  title: 'Privacy Policy',
  appName: 'Application: Cashcraft',
  version: 'Version: 1.0',
  lastUpdated: 'Last updated: June 12, 2025',
  intro: 'Cashcraft application (hereinafter referred to as the "Application") respects user privacy. Below is described what data is collected, how it is used and stored.',
  section1: {
    title: 'What data we collect',
    content: 'The Application may collect the following information:\n\n• Email address and username (when logging in via Google)\n• Financial data that the user enters independently (income, expenses, transactions)\n\nThe developer does not have access to the content of the entered financial data.',
  },
  section2: {
    title: 'Where data is stored',
    content: 'User data is stored:\n\n• Locally on the device (in SQLite database)\n• In Firebase cloud database (for authorization and synchronization)',
  },
  section3: {
    title: 'Data transfer to third parties',
    content: 'The Application does not transfer or sell personal data to third parties.',
  },
  section4: {
    title: 'Data deletion',
    content: 'Currently, automatic data deletion is not provided. The deletion feature may be added in future updates.',
  },
  section5: {
    title: 'Data security',
    content: 'Data is protected by standard Firebase and SQLite tools. Additional data encryption is not yet implemented.',
  },
  section6: {
    title: 'Advertising and analytics',
    content: 'The Application does not use advertising and does not connect third-party analytics.',
  },
  section7: {
    title: 'Contacts',
    content: 'If you have questions about privacy or a request to delete data, please contact us:',
  },
};

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  // Функция для безопасного получения перевода
  const getPrivacyText = (key: string, fallback: string) => {
    const translation = t(key as any);
    return translation !== key ? translation : fallback;
  };

  const sections = [
    {
      title: getPrivacyText('privacy.section1.title', privacyFallback.section1.title),
      content: getPrivacyText('privacy.section1.content', privacyFallback.section1.content),
    },
    {
      title: getPrivacyText('privacy.section2.title', privacyFallback.section2.title),
      content: getPrivacyText('privacy.section2.content', privacyFallback.section2.content),
    },
    {
      title: getPrivacyText('privacy.section3.title', privacyFallback.section3.title),
      content: getPrivacyText('privacy.section3.content', privacyFallback.section3.content),
    },
    {
      title: getPrivacyText('privacy.section4.title', privacyFallback.section4.title),
      content: getPrivacyText('privacy.section4.content', privacyFallback.section4.content),
    },
    {
      title: getPrivacyText('privacy.section5.title', privacyFallback.section5.title),
      content: getPrivacyText('privacy.section5.content', privacyFallback.section5.content),
    },
    {
      title: getPrivacyText('privacy.section6.title', privacyFallback.section6.title),
      content: getPrivacyText('privacy.section6.content', privacyFallback.section6.content),
    },
    {
      title: getPrivacyText('privacy.section7.title', privacyFallback.section7.title),
      content: getPrivacyText('privacy.section7.content', privacyFallback.section7.content),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {getPrivacyText('privacy.title', privacyFallback.title)}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.appName, { color: colors.primary }]}>
            {getPrivacyText('privacy.appName', privacyFallback.appName)}
          </Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            {getPrivacyText('privacy.version', privacyFallback.version)}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {getPrivacyText('privacy.lastUpdated', privacyFallback.lastUpdated)}
          </Text>
          
          <Text style={[styles.intro, { color: colors.text }]}>
            {getPrivacyText('privacy.intro', privacyFallback.intro)}
          </Text>

          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {`${index + 1}. ${section.title}`}
              </Text>
              <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                {section.content}
              </Text>
            </View>
          ))}

          <View style={styles.contactSection}>
            <Text style={[styles.contactText, { color: colors.text }]}>
              📧 cashcraft325@gmail.com
            </Text>
          </View>
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
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    marginBottom: 20,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 