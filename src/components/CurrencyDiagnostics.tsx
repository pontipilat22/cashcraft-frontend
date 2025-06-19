import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LocalDatabaseService } from '../services/localDatabase';
import { ExchangeRateService } from '../services/exchangeRate';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CurrencyDiagnostics: React.FC = () => {
  const { colors } = useTheme();
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setDiagnostics(prev => [...prev, `${new Date().toISOString().substr(11, 12)}: ${message}`]);
  };

  const runDiagnostics = async () => {
    setDiagnostics([]);
    setLoading(true);
    
    try {
      // 1. Проверяем локальную базу данных
      addLog('=== CHECKING LOCAL DATABASE ===');
      try {
        const localRates = await LocalDatabaseService.getAllExchangeRates();
        const rateCount = Object.keys(localRates).reduce((count, fromCurrency) => {
          return count + Object.keys(localRates[fromCurrency]).length;
        }, 0);
        addLog(`Local DB has ${rateCount} exchange rates`);
        
        if (rateCount > 0) {
          let sampleCount = 0;
          for (const fromCurrency in localRates) {
            for (const toCurrency in localRates[fromCurrency]) {
              addLog(`- ${fromCurrency} → ${toCurrency}: ${localRates[fromCurrency][toCurrency]}`);
              sampleCount++;
              if (sampleCount >= 3) break;
            }
            if (sampleCount >= 3) break;
          }
        }
      } catch (error: any) {
        addLog(`❌ Local DB error: ${error.message}`);
      }
      
      // 2. Проверяем режим курсов
      try {
        const mode = await LocalDatabaseService.getExchangeRatesMode();
        addLog(`Exchange rates mode: ${mode}`);
      } catch (error: any) {
        addLog(`❌ Mode error: ${error.message}`);
      }
      
      // 3. Тестируем получение конкретного курса
      addLog('\n=== TESTING RATE RETRIEVAL ===');
      try {
        const testRate = await ExchangeRateService.getRate('USD', 'EUR');
        addLog(`USD → EUR rate: ${testRate || 'NULL'}`);
      } catch (error: any) {
        addLog(`❌ Rate retrieval error: ${error.message}`);
      }
      
      // 4. Проверяем токен
      addLog('\n=== CHECKING AUTHENTICATION ===');
      try {
        const token = await AsyncStorage.getItem('@cashcraft_access_token');
        addLog(`Token exists: ${!!token}`);
        if (token) {
          addLog(`Token length: ${token.length} chars`);
        }
      } catch (error: any) {
        addLog(`❌ Token error: ${error.message}`);
      }
      
      // 5. Проверяем кеш курсов
      addLog('\n=== CHECKING RATES CACHE ===');
      try {
        const cachedRates = await ExchangeRateService.getCachedRatesForCurrency('USD');
        const cacheKeys = Object.keys(cachedRates);
        addLog(`Cached rates for USD: ${cacheKeys.length} currencies`);
        if (cacheKeys.length > 0) {
          cacheKeys.slice(0, 3).forEach(currency => {
            addLog(`- USD → ${currency}: ${cachedRates[currency]}`);
          });
        }
      } catch (error: any) {
        addLog(`❌ Cache error: ${error.message}`);
      }
      
      // 6. Пытаемся сохранить тестовый курс локально
      addLog('\n=== TESTING LOCAL SAVE ===');
      try {
        await LocalDatabaseService.saveExchangeRate('TEST', 'EUR', 1.234);
        addLog(`✅ Successfully saved TEST→EUR rate`);
        
        const testRate = await LocalDatabaseService.getLocalExchangeRate('TEST', 'EUR');
        addLog(`Retrieved test rate: ${testRate}`);
      } catch (error: any) {
        addLog(`❌ Save error: ${error.message}`);
      }
      
    } catch (error: any) {
      addLog(`\n❌ GENERAL ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Currency System Diagnostics</Text>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={runDiagnostics}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Diagnostics</Text>
        )}
      </TouchableOpacity>
      
      <ScrollView style={[styles.logs, { backgroundColor: colors.card }]}>
        {diagnostics.map((log, index) => (
          <Text 
            key={index} 
            style={[
              styles.logEntry, 
              { color: log.includes('❌') ? colors.danger : colors.text }
            ]}
          >
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logs: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
}); 