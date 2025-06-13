import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface HelpScreenProps {
  navigation: any;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Как добавить новый счет?',
    answer: 'Перейдите на вкладку "Счета" и нажмите кнопку "+" в правом верхнем углу. Выберите тип счета, введите название и начальный баланс. Вы можете выбрать валюту счета и настроить другие параметры.',
  },
  {
    question: 'Как добавить транзакцию?',
    answer: 'На главном экране нажмите кнопку "+" внизу экрана. Выберите тип операции (доход/расход/перевод), укажите сумму, категорию и счет. При необходимости добавьте описание.',
  },
  {
    question: 'Что такое категории и как их настроить?',
    answer: 'Категории помогают группировать ваши доходы и расходы. Перейдите в "Ещё" → "Категории", чтобы увидеть стандартные категории. В будущих версиях будет добавлена возможность создания собственных категорий.',
  },
  {
    question: 'Как работают переводы между счетами?',
    answer: 'При создании транзакции выберите тип "Перевод". Укажите счет отправления и счет получения. Если счета в разных валютах, приложение автоматически применит курс обмена.',
  },
  {
    question: 'Как изменить валюту по умолчанию?',
    answer: 'Перейдите в "Ещё" → "Настройки" → "Валюта". Выберите нужную валюту из списка. Если у вас есть счета в других валютах, приложение попросит указать курсы обмена.',
  },
  {
    question: 'Как настроить курсы валют?',
    answer: 'В настройках выберите "Курсы валют". Здесь вы можете добавить, изменить или удалить курсы обмена между различными валютами. Курсы сохраняются и используются для автоматического пересчета.',
  },
  {
    question: 'Как работает синхронизация данных?',
    answer: 'Если вы вошли в аккаунт Google, ваши данные автоматически синхронизируются с облаком Firebase. Это позволяет использовать приложение на нескольких устройствах. В гостевом режиме данные хранятся только локально.',
  },
  {
    question: 'Сколько счетов можно создать?',
    answer: 'В бесплатной версии и гостевом режиме можно создать до 2 счетов. Для неограниченного количества счетов необходимо войти в аккаунт и оформить подписку Premium.',
  },
  {
    question: 'Как удалить транзакцию?',
    answer: 'Найдите нужную транзакцию в списке и смахните её влево. Появится кнопка удаления. Подтвердите удаление во всплывающем окне.',
  },
  {
    question: 'Как изменить язык приложения?',
    answer: 'Перейдите в "Ещё" → "Настройки" → "Язык". Выберите предпочитаемый язык из списка доступных. Приложение поддерживает 13 языков.',
  },
  {
    question: 'Что делать, если забыл пароль?',
    answer: 'На экране входа нажмите "Забыли пароль?". Введите email, который использовали при регистрации. На почту придут инструкции по восстановлению пароля.',
  },
  {
    question: 'Как экспортировать данные?',
    answer: 'Функция экспорта данных находится в разработке и будет добавлена в будущих обновлениях приложения.',
  },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

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
          Помощь
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Часто задаваемые вопросы
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
            Полезные советы
          </Text>
          
          <View style={styles.tipItem}>
            <Ionicons name="bulb-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Регулярно записывайте все транзакции, чтобы иметь точную картину своих финансов
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="calculator-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Используйте категории для анализа, на что уходит больше всего денег
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="trending-up-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Ставьте финансовые цели и отслеживайте прогресс с помощью накопительных счетов
            </Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="sync-outline" size={24} color={colors.primary} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Войдите в аккаунт для автоматического резервного копирования данных
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Контакты поддержки
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={openEmail}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
            <View style={styles.contactInfo}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>
                Email поддержки
              </Text>
              <Text style={[styles.contactValue, { color: colors.primary }]}>
                cashcraft325@gmail.com
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.responseTime}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.responseTimeText, { color: colors.textSecondary }]}>
              Обычно мы отвечаем в течение 24-48 часов
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            О приложении
          </Text>
          
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Cashcraft - это простое и удобное приложение для учета личных финансов. 
            Мы постоянно работаем над улучшением функциональности и будем рады вашим предложениям.
          </Text>
          
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Версия приложения: 1.0.0
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