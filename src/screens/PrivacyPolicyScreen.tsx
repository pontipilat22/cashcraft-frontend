import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyScreenProps {
  navigation: any;
}



export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();



  const sections = [
    {
      title: t('privacy.section1.title'),
      content: t('privacy.section1.content'),
    },
    {
      title: t('privacy.section2.title'),
      content: t('privacy.section2.content'),
    },
    {
      title: t('privacy.section3.title'),
      content: t('privacy.section3.content'),
    },
    {
      title: t('privacy.section4.title'),
      content: t('privacy.section4.content'),
    },
    {
      title: t('privacy.section5.title'),
      content: t('privacy.section5.content'),
    },
    {
      title: t('privacy.section6.title'),
      content: t('privacy.section6.content'),
    },
    {
      title: t('privacy.section7.title'),
      content: t('privacy.section7.content'),
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
          {t('privacy.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.appName, { color: colors.primary }]}>
              {t('privacy.appName')}
            </Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>
              {t('privacy.version')}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {t('privacy.lastUpdated')}
            </Text>
            
            <Text style={[styles.intro, { color: colors.text }]}>
              {t('privacy.intro')}
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

            <View style={[styles.contactSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.contactText, { color: colors.text }]}>
                📧 cashcraft325@gmail.com
              </Text>
            </View>
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
    borderBottomColor: '#00000010',
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
    flexGrow: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  version: {
    fontSize: 12,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    marginBottom: 12,
  },
  intro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    textAlign: 'justify',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  sectionContent: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'justify',
  },
  contactSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 