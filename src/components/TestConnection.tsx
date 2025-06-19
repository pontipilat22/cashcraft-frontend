import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { ApiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface TestConnectionProps {
  visible: boolean;
  onClose: () => void;
}

export const TestConnection: React.FC<TestConnectionProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const { colors } = useTheme();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testConnection = async () => {
    setLogs([]);
    addLog('Starting connection test...');
    
    try {
      // 1. Проверяем токен
      const token = await AsyncStorage.getItem('@cashcraft_access_token');
      addLog(`Token exists: ${!!token}`);
      
      // 2. Тест health endpoint
      addLog('Testing health endpoint...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
        
        const healthResponse = await fetch('http://192.168.2.101:3000/health', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        addLog(`Health response status: ${healthResponse.status}`);
        const healthData = await healthResponse.text();
        addLog(`Health data: ${healthData}`);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          addLog('Health check TIMEOUT after 5 seconds');
        } else {
          addLog(`Health check error: ${error.message}`);
        }
      }
      
      // 2.5 Тест альтернативного сервера
      addLog('\nTesting alternative server on port 3001...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const testResponse = await fetch('http://192.168.2.101:3001/health', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        addLog(`Test server response status: ${testResponse.status}`);
        const testData = await testResponse.text();
        addLog(`Test server data: ${testData}`);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          addLog('Test server TIMEOUT after 5 seconds');
        } else {
          addLog(`Test server error: ${error.message}`);
        }
      }
      
      // 3. Тест API endpoint без авторизации
      addLog('Testing exchange rate API without auth...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const rateResponse = await fetch('http://192.168.2.101:3000/api/v1/exchange-rates/rate?from=USD&to=EUR', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        addLog(`Rate API response status: ${rateResponse.status}`);
        const rateData = await rateResponse.text();
        addLog(`Rate data: ${rateData}`);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          addLog('Rate API TIMEOUT after 5 seconds');
        } else {
          addLog(`Rate API error: ${error.message}`);
        }
      }
      
      // 4. Тест через ApiService
      addLog('Testing through ApiService...');
      try {
        const apiResponse = await ApiService.get('/exchange-rates/rate?from=USD&to=EUR');
        addLog(`ApiService response: ${JSON.stringify(apiResponse)}`);
      } catch (error: any) {
        addLog(`ApiService error: ${error.message}`);
      }
      
      // 5. Тест с токеном напрямую
      if (token) {
        addLog('Testing with token directly...');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const authResponse = await fetch('http://192.168.2.101:3000/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          addLog(`Auth response status: ${authResponse.status}`);
          const authData = await authResponse.text();
          addLog(`Auth data: ${authData}`);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            addLog('Auth check TIMEOUT after 5 seconds');
          } else {
            addLog(`Auth check error: ${error.message}`);
          }
        }
      }
      
      // 6. Показываем информацию о сети
      addLog('\nNetwork info:');
      addLog(`Platform: ${Platform.OS}`);
      addLog(`API Base URL from service: http://192.168.2.101:3000/api/v1`);
      
    } catch (error: any) {
      addLog(`General error: ${error.message}`);
      addLog(`Error type: ${error.constructor.name}`);
      addLog(`Stack: ${error.stack}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Backend Connection Test</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.primary }]} 
            onPress={testConnection}
          >
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>
          
          <ScrollView style={[styles.logs, { backgroundColor: colors.background }]}>
            {logs.map((log, index) => (
              <Text key={index} style={[styles.logEntry, { color: colors.text }]}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  testButton: {
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
    padding: 10,
    borderRadius: 5,
  },
  logEntry: {
    fontSize: 10,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
}); 