// C:\project\cashcraft3\src\services\aiService.ts

import { ApiService } from './api';

// 1. ОПРЕДЕЛЯЕМ ТИПЫ ДАННЫХ, С КОТОРЫМИ РАБОТАЕМ

/**
 * Тип сообщения для отображения в чате на экране.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Сделаем timestamp обязательным для уникальных ключей в FlatList
}

/**
 * Тип ответа, который мы теперь ожидаем от НАШЕГО backend'а.
 * Он может быть двух видов: обычный текст или вызов инструмента.
 * Именно это исправит все ваши ошибки TypeScript.
 */
export type AIResponse = 
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool_name: string; arguments: any };


/**
 * Сервис для работы с AI помощником
 */
export class AIService {

  /**
   * Главный метод для отправки сообщения AI.
   * Теперь он принимает вторым аргументом список инструментов.
   * Возвращает Promise с нашим новым сложным типом AIResponse.
   * 
   * @param messages История сообщений чата
   * @param tools Список доступных инструментов для AI
   * @returns Ответ от AI в виде объекта AIResponse
   */
  static async sendMessage(
    messages: ChatMessage[],
    tools: any[]
  ): Promise<AIResponse> {
    try {
      console.log('🤖 [AIService] Отправка сообщения AI с инструментами...');

      // Форматируем сообщения для API (убираем timestamp)
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Отправляем на backend сообщения И инструменты
      const response: AIResponse = await ApiService.post('/ai/chat', {
        messages: formattedMessages,
        tools: tools,
      });

      console.log('✅ [AIService] Получен структурированный ответ от AI:', response);

      // Просто возвращаем полученный объект, фронтенд сам разберется, что это
      return response;

    } catch (error: any) {
      console.error('❌ [AIService] Ошибка при отправке сообщения:', error);
      throw new Error(error?.message || 'Не удалось получить ответ от AI');
    }
  }

  /**
   * Получить приветственное сообщение для финансового помощника.
   * Обновим текст, чтобы намекнуть на новые возможности.
   */
  static getWelcomeMessage(): ChatMessage {
    return {
      role: 'assistant',
      content: 'Привет! Я ваш финансовый AI-помощник. Чем могу помочь? Вы можете попросить меня создать счет или добавить транзакцию.',
      timestamp: Date.now()
    };
  }

  // Функции getFinancialContext и getSystemMessage больше не нужны на фронтенде.
  // Вся логика системного промпта теперь находится на backend'е для более
  // надежного управления вызовом инструментов.
}