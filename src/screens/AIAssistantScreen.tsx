import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';
import { useNavigation } from '@react-navigation/native';
import { AIService, ChatMessage } from '../services/aiService';

export const AIAssistantScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { createAccount, createTransaction, accounts, categories } = useData();
  const navigation = useNavigation();

  // Принудительно скрываем tab bar при монтировании (ваш код, он правильный)
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarStyle: { display: 'flex' } });
      }
    };
  }, [navigation]);

  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    AIService.getWelcomeMessage()
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. ОПРЕДЕЛЯЕМ ИНСТРУМЕНТЫ, КОТОРЫЕ AI МОЖЕТ ИСПОЛЬЗОВАТЬ
  const availableTools = [
    {
      name: 'createAccount',
      description: 'Создает новый финансовый счет (например, наличные, карту, банковский счет, накопления, инвестиции).',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Название нового счета, например "Карта Kaspi" или "Копилка".',
          },
          currency: {
            type: 'string',
            description: 'Трехбуквенный код валюты, например KZT, USD, RUB.',
          },
          accountType: {
            type: 'string',
            description: 'Тип счета: "cash" для наличных, "card" для карты, "bank" для банковского счета, "savings" для накоплений, "investment" для инвестиций.',
            enum: ['cash', 'card', 'bank', 'savings', 'investment'],
          },
        },
        required: ['name', 'currency', 'accountType'],
      },
    },
    {
      name: 'addTransaction',
      description: 'Добавляет новую транзакцию расхода или дохода.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Сумма транзакции.',
          },
          category: {
            type: 'string',
            description: 'Категория транзакции, например "Продукты", "Такси", "Зарплата".',
          },
          type: {
            type: 'string',
            description: 'Тип транзакции: "expense" для расхода или "income" для дохода.',
          },
        },
        required: ['amount', 'category', 'type'],
      },
    },
  ];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 2. ОБНОВЛЯЕМ ЛОГИКУ ОТПРАВКИ И ОБРАБОТКИ ОТВЕТА
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Отправляем запрос к AI вместе со списком доступных инструментов
      const aiResponse = await AIService.sendMessage(newMessages, availableTools);

      // Проверяем тип ответа от AI
      if (aiResponse.type === 'tool_call') {
        // AI хочет использовать инструмент
        handleToolCall(aiResponse.tool_name, aiResponse.arguments);
      } else {
        // AI просто ответил текстом
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse.content, // Ответ теперь в поле content
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Ошибка при общении с AI:', error);
      Alert.alert(
        t('ai.error') || 'Ошибка',
        error?.message || t('ai.errorMessage') || 'Не удалось получить ответ от AI'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ДОБАВЛЯЕМ ОБРАБОТЧИК КОМАНД ОТ AI (TOOL CALLS)
  const handleToolCall = async (toolName: string, args: any) => {
    let infoMessageText = '';

    // Показываем пользователю, что начинаем выполнять команду
    const accountTypeLabels: Record<string, string> = {
      cash: 'наличные',
      card: 'карту',
      bank: 'банковский счет',
      savings: 'накопления',
      investment: 'инвестиции',
    };

    switch (toolName) {
      case 'createAccount':
        const typeLabel = args.accountType ? (accountTypeLabels[args.accountType] || 'счет') : 'счет';
        infoMessageText = `Создаю ${typeLabel} "${args.name || ''}" в валюте ${args.currency || ''}...`;
        break;
      case 'addTransaction':
        infoMessageText = `Добавляю ${args.type === 'income' ? 'доход' : 'расход'} "${args.category || ''}" на сумму ${args.amount || 0}...`;
        break;
      default:
        infoMessageText = 'Получена неизвестная команда от AI.';
    }

    const infoMessage: ChatMessage = {
        role: 'assistant',
        content: infoMessageText,
        timestamp: Date.now(),
    };
    setMessages(prev => [...prev, infoMessage]);

    // Выполняем действие напрямую
    try {
      let successMessage = '';

      switch (toolName) {
        case 'createAccount':
          // Создаем счет напрямую через DataContext
          const accountType = args.accountType || 'cash';
          await createAccount({
            name: args.name,
            balance: 0, // Начальный баланс 0
            currency: args.currency,
            type: accountType,
            isIncludedInTotal: true,
          });
          const createdTypeLabel = accountTypeLabels[accountType] || 'счет';
          successMessage = `✅ ${createdTypeLabel.charAt(0).toUpperCase() + createdTypeLabel.slice(1)} "${args.name}" успешно создан!`;
          break;

        case 'addTransaction':
          // Создаем транзакцию напрямую через DataContext
          if (!accounts || accounts.length === 0) {
            throw new Error('Сначала создайте счет для добавления транзакций');
          }

          // Находим первый доступный счет
          const defaultAccount = accounts.find(acc => acc.isIncludedInTotal) || accounts[0];

          // Находим категорию
          const categoryName = args.category;
          let category = categories?.find(cat =>
            cat.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (!category) {
            // Если категория не найдена, используем "Разное" или "Other"
            category = categories?.find(cat =>
              cat.name === 'Разное' || cat.name === 'Other' || cat.name.toLowerCase() === 'other'
            );
          }

          await createTransaction({
            amount: args.amount,
            type: args.type || 'expense',
            categoryId: category?.id || '',
            accountId: defaultAccount.id,
            date: new Date().toISOString(),
            description: `Добавлено через AI помощника`,
          });

          successMessage = `✅ ${args.type === 'income' ? 'Доход' : 'Расход'} на сумму ${args.amount} успешно добавлен!`;
          break;

        default:
          console.warn('AI вызвал неизвестный инструмент:', toolName);
          throw new Error('Неизвестная команда');
      }

      // Показываем сообщение об успехе
      const successMsg: ChatMessage = {
        role: 'assistant',
        content: successMessage,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, successMsg]);

    } catch (error: any) {
      console.error('❌ [AIAssistantScreen] Ошибка выполнения команды:', error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `❌ Ошибка: ${error?.message || 'Не удалось выполнить команду'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };


  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // ... остальной код рендеринга без изменений
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer
        ]}
      >
        {!isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.card }
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? { color: '#fff' } : { color: colors.text }
            ]}
          >
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '40' }]}>
            <Ionicons name="person" size={16} color={colors.primary} />
          </View>
        )}
      </View>
    );
  };

  return (
    // ... остальной JSX код без изменений
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('ai.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {t('ai.subtitle')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('ai.thinking') || 'AI думает...'}
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
            placeholder={t('ai.inputPlaceholder') || 'Задайте вопрос...'}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.border }
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... все ваши стили без изменений
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});