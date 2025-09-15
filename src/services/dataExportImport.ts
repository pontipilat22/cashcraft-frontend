import { LocalDatabaseService } from './localDatabase';
import { Account, Transaction, Category, Debt, Goal } from '../types';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class DataExportImportService {
  
  // Экспорт данных в CSV формат (создает текст для копирования)
  static async exportToCSV(): Promise<string> {
    try {
      // Получаем все данные
      const [accounts, transactions, categories, debts, goals] = await Promise.all([
        LocalDatabaseService.getAccounts(),
        LocalDatabaseService.getTransactions(),
        LocalDatabaseService.getCategories(),
        LocalDatabaseService.getDebts(),
        LocalDatabaseService.getGoals()
      ]);

      let csvContent = '';
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Добавляем метаданные
      csvContent += `CashCraft Data Export - ${timestamp}\n`;
      csvContent += `Version: 1.0\n`;
      csvContent += '\n';
      
      // Добавляем счета
      csvContent += '### ACCOUNTS ###\n';
      csvContent += this.createAccountsCSV(accounts);
      csvContent += '\n\n';
      
      // Добавляем транзакции
      csvContent += '### TRANSACTIONS ###\n';
      csvContent += this.createTransactionsCSV(transactions);
      csvContent += '\n\n';
      
      // Добавляем категории
      csvContent += '### CATEGORIES ###\n';
      csvContent += this.createCategoriesCSV(categories);
      csvContent += '\n\n';
      
      // Добавляем долги
      csvContent += '### DEBTS ###\n';
      csvContent += this.createDebtsCSV(debts);
      csvContent += '\n\n';

      // Добавляем цели
      csvContent += '### GOALS ###\n';
      csvContent += this.createGoalsCSV(goals);

      return csvContent;
    } catch (error) {
      console.error('Ошибка экспорта данных:', error);
      throw error;
    }
  }

  // Создание CSV для счетов
  private static createAccountsCSV(accounts: Account[]): string {
    const headers = ['ID', 'Name', 'Type', 'Balance', 'Currency', 'Card Number', 'Is Default', 'Include in Total', 'Created At'];
    const rows = accounts.map(acc => [
      acc.id,
      acc.name,
      acc.type,
      acc.balance,
      acc.currency || 'USD',
      acc.cardNumber || '',
      acc.isDefault ? 'Yes' : 'No',
      acc.isIncludedInTotal !== false ? 'Yes' : 'No',
      acc.createdAt
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Создание CSV для транзакций
  private static createTransactionsCSV(transactions: Transaction[]): string {
    const headers = ['ID', 'Amount', 'Type', 'Description', 'Date', 'Account ID', 'Category ID', 'Created At'];
    const rows = transactions.map(t => [
      t.id,
      t.amount,
      t.type,
      t.description || '',
      t.date,
      t.accountId,
      t.categoryId || '',
      t.createdAt
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Создание CSV для категорий
  private static createCategoriesCSV(categories: Category[]): string {
    const headers = ['ID', 'Name', 'Type', 'Icon', 'Color'];
    const rows = categories.map(cat => [
      cat.id,
      cat.name,
      cat.type,
      cat.icon || '',
      cat.color || ''
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Создание CSV для долгов
  private static createDebtsCSV(debts: Debt[]): string {
    const headers = ['ID', 'Type', 'Name', 'Amount', 'Currency', 'Due Date', 'Include in Total', 'Created At'];
    const rows = debts.map(debt => [
      debt.id,
      debt.type,
      debt.name,
      debt.amount,
      debt.currency || 'USD',
      debt.dueDate || '',
      debt.isIncludedInTotal !== false ? 'Yes' : 'No',
      debt.createdAt
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Создание CSV для целей
  private static createGoalsCSV(goals: Goal[]): string {
    const headers = ['ID', 'Name', 'Target Amount', 'Current Amount', 'Currency', 'Icon', 'Description', 'Created At'];
    const rows = goals.map(goal => [
      goal.id,
      goal.name,
      goal.targetAmount,
      goal.currentAmount,
      goal.currency || 'USD',
      goal.icon || '',
      goal.description || '',
      goal.createdAt
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Преобразование массива в CSV строку
  private static arrayToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(cell => {
        // Экранируем кавычки и оборачиваем в кавычки если есть запятые
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  // Сохранение экспорта в AsyncStorage для последующего использования
  static async saveExportToStorage(csvContent: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const key = `export_${timestamp}`;
    await AsyncStorage.setItem(key, csvContent);
    
    // Сохраняем список экспортов
    const exportsListStr = await AsyncStorage.getItem('exports_list') || '[]';
    const exportsList = JSON.parse(exportsListStr);
    exportsList.push({ key, timestamp });
    
    // Оставляем только последние 10 экспортов
    if (exportsList.length > 10) {
      const oldExport = exportsList.shift();
      await AsyncStorage.removeItem(oldExport.key);
    }
    
    await AsyncStorage.setItem('exports_list', JSON.stringify(exportsList));
  }

  // Получение списка сохраненных экспортов
  static async getSavedExports(): Promise<Array<{ key: string; timestamp: string }>> {
    const exportsListStr = await AsyncStorage.getItem('exports_list') || '[]';
    return JSON.parse(exportsListStr);
  }

  // Получение конкретного экспорта
  static async getExport(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  // Импорт данных из CSV текста
  static async importFromCSV(csvContent: string): Promise<void> {
    try {
      const sections = this.parseSections(csvContent);
      
      // Импортируем категории первыми
      if (sections.categories) {
        await this.importCategories(sections.categories);
      }
      
      // Затем счета
      if (sections.accounts) {
        await this.importAccounts(sections.accounts);
      }
      
      // Потом транзакции (они зависят от счетов и категорий)
      if (sections.transactions) {
        await this.importTransactions(sections.transactions);
      }
      
      // Затем долги
      if (sections.debts) {
        await this.importDebts(sections.debts);
      }

      // И наконец цели
      if (sections.goals) {
        await this.importGoals(sections.goals);
      }
      
    } catch (error) {
      console.error('Ошибка импорта данных:', error);
      throw error;
    }
  }

  // Парсинг секций из CSV контента
  private static parseSections(content: string): { [key: string]: string } {
    const sections: { [key: string]: string } = {};
    const lines = content.split('\n');
    let currentSection = '';
    let sectionContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('### ') && line.endsWith(' ###')) {
        // Сохраняем предыдущую секцию
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }
        
        // Начинаем новую секцию
        currentSection = line.replace(/### /g, '').toLowerCase();
        sectionContent = [];
      } else if (currentSection && line.trim()) {
        sectionContent.push(line);
      }
    }
    
    // Сохраняем последнюю секцию
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n');
    }
    
    return sections;
  }

  // Парсинг CSV
  private static parseCSV(content: string): string[][] {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Пропускаем следующую кавычку
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current);
      return result;
    });
  }

  // Импорт счетов
  private static async importAccounts(csvContent: string): Promise<void> {
    const rows = this.parseCSV(csvContent);
    const dataRows = rows.slice(1); // Пропускаем заголовки

    for (const row of dataRows) {
      // Проверяем, не существует ли уже счет с таким именем
      const existingAccount = await LocalDatabaseService.findAccountByName(row[1]);
      if (!existingAccount) {
        const accountData = {
          name: row[1],
          type: row[2] as Account['type'],
          balance: parseFloat(row[3]) || 0,
          currency: row[4] || 'USD',
          cardNumber: row[5] || undefined,
          isDefault: row[6] === 'Yes',
          isIncludedInTotal: row[7] !== 'No'
        };

        await LocalDatabaseService.createAccount(accountData);
      }
    }
  }

  // Импорт транзакций
  private static async importTransactions(csvContent: string): Promise<void> {
    const rows = this.parseCSV(csvContent);
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      const transactionData = {
        amount: parseFloat(row[1]) || 0,
        type: row[2] as Transaction['type'],
        description: row[3] || '',
        date: row[4],
        accountId: row[5],
        categoryId: row[6] || undefined
      };

      // Проверяем существование счета
      const accounts = await LocalDatabaseService.getAccounts();
      const accountExists = accounts.some(acc => acc.id === transactionData.accountId);
      
      if (accountExists) {
        await LocalDatabaseService.createTransaction(transactionData);
      }
    }
  }

  // Импорт категорий
  private static async importCategories(csvContent: string): Promise<void> {
    const rows = this.parseCSV(csvContent);
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      const categoryData = {
        name: row[1],
        type: row[2] as Category['type'],
        icon: row[3] || undefined,
        color: row[4] || undefined
      };

      // Проверяем, не существует ли уже такая категория
      const existing = await LocalDatabaseService.findCategoryByName(categoryData.name);
      if (!existing) {
        await LocalDatabaseService.createCategory(categoryData);
      }
    }
  }

  // Импорт долгов
  private static async importDebts(csvContent: string): Promise<void> {
    const rows = this.parseCSV(csvContent);
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      const debtData = {
        type: row[1] as Debt['type'],
        name: row[2],
        amount: parseFloat(row[3]) || 0,
        currency: row[4] || 'USD',
        dueDate: row[5] || undefined,
        isIncludedInTotal: row[6] !== 'No'
      };

      // Проверяем, не существует ли уже такой долг
      const existing = await LocalDatabaseService.findDebtByName(debtData.name);
      if (!existing) {
        await LocalDatabaseService.createDebt(debtData);
      }
    }
  }

  // Импорт целей
  private static async importGoals(csvContent: string): Promise<void> {
    const rows = this.parseCSV(csvContent);
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      const goalData = {
        name: row[1],
        targetAmount: parseFloat(row[2]) || 0,
        currentAmount: parseFloat(row[3]) || 0,
        currency: row[4] || 'USD',
        icon: row[5] || undefined,
        description: row[6] || undefined
      };

      // Проверяем, не существует ли уже такая цель
      const existing = await LocalDatabaseService.findGoalByName(goalData.name);
      if (!existing) {
        await LocalDatabaseService.createGoal(goalData);
      }
    }
  }

  // Форматирование данных для отображения в UI
  static formatExportPreview(csvContent: string): {
    accounts: number;
    transactions: number;
    categories: number;
    debts: number;
    goals: number;
    totalSize: string;
  } {
    const sections = this.parseSections(csvContent);

    const countRows = (section: string | undefined): number => {
      if (!section) return 0;
      return this.parseCSV(section).length - 1; // Минус заголовки
    };

    return {
      accounts: countRows(sections.accounts),
      transactions: countRows(sections.transactions),
      categories: countRows(sections.categories),
      debts: countRows(sections.debts),
      goals: countRows(sections.goals),
      totalSize: `${(csvContent.length / 1024).toFixed(1)} KB`
    };
  }
} 