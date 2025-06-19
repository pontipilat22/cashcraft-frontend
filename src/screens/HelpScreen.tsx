import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalization } from '../context/LocalizationContext';

interface HelpScreenProps {
  navigation: any;
}

interface FAQItem {
  question: string;
  answer: string;
}

// FAQ data will be initialized inside component to use translations

export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqData: FAQItem[] = [
    {
      question: t('help.questions.addAccount.question'),
      answer: t('help.questions.addAccount.answer'),
    },
    {
      question: t('help.questions.addTransaction.question'),
      answer: t('help.questions.addTransaction.answer'),
    },
    {
      question: t('help.questions.categories.question'),
      answer: t('help.questions.categories.answer'),
    },
    {
      question: t('help.questions.transfers.question'),
      answer: t('help.questions.transfers.answer'),
    },
    {
      question: t('help.questions.defaultCurrency.question'),
      answer: t('help.questions.defaultCurrency.answer'),
    },
    {
      question: t('help.questions.exchangeRates.question'),
      answer: t('help.questions.exchangeRates.answer'),
    },
    {
      question: t('help.questions.dataSync.question'),
      answer: t('help.questions.dataSync.answer'),
    },
    {
      question: t('help.questions.accountLimit.question'),
      answer: t('help.questions.accountLimit.answer'),
    },
    {
      question: t('help.questions.deleteTransaction.question'),
      answer: t('help.questions.deleteTransaction.answer'),
    },
    {
      question: t('help.questions.changeLanguage.question'),
      answer: t('help.questions.changeLanguage.answer'),
    },
    {
      question: t('help.questions.forgotPassword.question'),
      answer: t('help.questions.forgotPassword.answer'),
    },
    {
      question: t('help.questions.exportData.question'),
      answer: t('help.questions.exportData.answer'),
    },
  ];

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const openEmail = () => {
    Linking.openURL('mailto:cashcraft325@gmail.com?subject=Помощь с приложением Cashcraft');
  };

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
          {t('help.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('help.faqTitle')}
          </Text>
          
          {faqData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, { borderBottomColor: colors.border }]}
              onPress={() => toggleItem(index)}
              activeOpacity={0.7}
            >
              <View style={styles.questionContainer}>
                <Text style={[styles.question, { color: colors.text }]}>
                  {item.question}
                </Text>
                <Ionicons
                  name={expandedItems.includes(index) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              {expandedItems.includes(index) && (
                <Text style={[styles.answer, { color: colors.textSecondary }]}>
                  {item.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('help.tipsTitle')}
          </Text>
          
          <View style={styles.tipItem}>
            <Ionicons name="bulb-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('help.tips.recordTransactions')}
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="calculator-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('help.tips.useCategories')}
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="trending-up-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('help.tips.setGoals')}
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="sync-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('help.tips.backup')}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('help.contactTitle')}
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={openEmail}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>
                {t('help.emailSupport')}
              </Text>
              <Text style={[styles.contactValue, { color: colors.primary }]}>
                cashcraft325@gmail.com
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.responseTime}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.responseTimeText, { color: colors.textSecondary }]}>
              {t('help.responseTime')}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('help.aboutTitle')}
          </Text>
          
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            {t('help.aboutText')}
          </Text>
          
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {t('help.version')} 1.0.0
          </Text>
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
    paddingVertical: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  responseTimeText: {
    fontSize: 14,
    marginLeft: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
}); 