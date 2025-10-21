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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useData } from '../context/DataContext';
import { useNavigation } from '@react-navigation/native';
import { AIService, ChatMessage } from '../services/aiService';

const CHAT_HISTORY_KEY = '@ai_chat_history';

export const AIAssistantScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { createAccount, createTransaction, deleteAccount, accounts, categories } = useData();
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

  // Загрузка истории чата при монтировании
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Сохранение истории при изменении сообщений
  useEffect(() => {
    if (messages.length > 1) { // Сохраняем только если есть сообщения кроме приветствия
      saveChatHistory();
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed);
        console.log('✅ История чата загружена:', parsed.length, 'сообщений');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки истории чата:', error);
    }
  };

  const saveChatHistory = async () => {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('❌ Ошибка сохранения истории чата:', error);
    }
  };

  const clearChatHistory = async () => {
    Alert.alert(
      t('ai.clearHistory') || 'Очистить историю',
      t('ai.clearHistoryConfirm') || 'Вы уверены, что хотите удалить всю историю чата?',
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        {
          text: t('common.delete') || 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
              setMessages([AIService.getWelcomeMessage()]);
              console.log('✅ История чата очищена');
            } catch (error) {
              console.error('❌ Ошибка очистки истории:', error);
            }
          },
        },
      ]
    );
  };

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
          date: {
            type: 'string',
            description: 'Дата транзакции в формате "YYYY-MM-DD". Например "2025-10-16". Если не указана, используется текущая дата.',
          },
        },
        required: ['amount', 'category', 'type'],
      },
    },
    {
      name: 'deleteAccount',
      description: 'Удаляет существующий счет по его названию.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Название счета для удаления, например "Kaspi" или "Наличные".',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'deleteTransaction',
      description: 'Удаляет последнюю транзакцию по указанной категории или сумме.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Категория транзакции для удаления.',
          },
          amount: {
            type: 'number',
            description: 'Сумма транзакции для удаления (опционально).',
          },
        },
        required: ['category'],
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
      if (aiResponse.type === 'tool_calls') {
        // AI хочет использовать один или несколько инструментов
        console.log(`📋 AI запросил ${aiResponse.calls.length} действий`);

        const results: string[] = [];

        // Выполняем все вызовы последовательно и собираем результаты
        for (const call of aiResponse.calls) {
          const result = await handleToolCall(call.tool_name, call.arguments);
          if (result) results.push(result);
          // Небольшая задержка между действиями для лучшего UX
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Показываем одно итоговое сообщение со всеми результатами
        if (results.length > 0) {
          const summaryMessage: ChatMessage = {
            role: 'assistant',
            content: results.join('\n'),
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, summaryMessage]);
        }
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
  const handleToolCall = async (toolName: string, args: any): Promise<string> => {
    const accountTypeLabels: Record<string, string> = {
      cash: 'наличные',
      card: 'карту',
      bank: 'банковский счет',
      savings: 'накопления',
      investment: 'инвестиции',
    };

    try {
      switch (toolName) {
        case 'createAccount':
          const accountType = args.accountType || 'cash';
          await createAccount({
            name: args.name,
            balance: 0,
            currency: args.currency,
            type: accountType,
            isIncludedInTotal: true,
          });
          const createdTypeLabel = accountTypeLabels[accountType] || 'счет';
          return `✅ ${createdTypeLabel.charAt(0).toUpperCase() + createdTypeLabel.slice(1)} "${args.name}" создан`;

        case 'addTransaction':
          if (!accounts || accounts.length === 0) {
            return '❌ Сначала создайте счет для добавления транзакций';
          }

          const defaultAccount = accounts.find(acc => acc.isIncludedInTotal) || accounts[0];
          const categoryName = args.category;
          let category = categories?.find(cat =>
            cat.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (!category) {
            category = categories?.find(cat =>
              cat.name === 'Разное' || cat.name === 'Other' || cat.name.toLowerCase() === 'other'
            );
          }

          // Обработка даты
          let transactionDate: string;
          if (args.date) {
            // Если дата передана в формате YYYY-MM-DD, преобразуем в ISO
            const parsedDate = new Date(args.date);
            transactionDate = parsedDate.toISOString();
          } else {
            transactionDate = new Date().toISOString();
          }

          await createTransaction({
            amount: args.amount,
            type: args.type || 'expense',
            categoryId: category?.id || '',
            accountId: defaultAccount.id,
            date: transactionDate,
            description: `Добавлено через AI помощника`,
          });

          const dateStr = args.date ? ` за ${args.date}` : '';
          return `✅ ${args.type === 'income' ? 'Доход' : 'Расход'} ${args.amount} (${args.category})${dateStr} добавлен`;

        case 'deleteAccount':
          const accountToDelete = accounts?.find(acc =>
            acc.name.toLowerCase() === args.name.toLowerCase()
          );
          if (!accountToDelete) {
            return `❌ Счет "${args.name}" не найден`;
          }
          await deleteAccount(accountToDelete.id);
          return `✅ Счет "${args.name}" удален`;

        case 'deleteTransaction':
          // Находим последнюю транзакцию по категории
          const targetCategory = categories?.find(cat =>
            cat.name.toLowerCase() === args.category.toLowerCase()
          );
          if (!targetCategory) {
            return `❌ Категория "${args.category}" не найдена`;
          }

          // Здесь нужно найти транзакцию через transactions из DataContext
          // Упрощенная версия - просто возвращаем успех
          // TODO: нужен доступ к transactions для поиска конкретной транзакции
          return `⚠️ Удаление транзакций через AI пока в разработке`;

        default:
          return `❌ Неизвестная команда: ${toolName}`;
      }
    } catch (error: any) {
      console.error('❌ [AIAssistantScreen] Ошибка выполнения команды:', error);
      return `❌ Ошибка: ${error?.message || 'Не удалось выполнить команду'}`;
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={clearChatHistory}
        >
          <Ionicons name="trash-outline" size={22} color={colors.text} />
        </TouchableOpacity>
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