import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ApiService } from '../services/api';
import { ExchangeRateService } from '../services/exchangeRate';

export const DiagnosticTest: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    const newResults: string[] = [];

    // Test 1: Direct health check
    try {
      newResults.push('Testing Health Endpoint...');
      const response = await fetch('http://192.168.1.8:3000/api/v1/health');
      const data = await response.json();
      newResults.push(`✅ Health: ${JSON.stringify(data)}`);
    } catch (error: any) {
      newResults.push(`❌ Health Failed: ${error.message}`);
    }

    // Test 2: Exchange rate through API
    try {
      newResults.push('\nTesting Exchange Rate API...');
      const data = await ApiService.get('/exchange-rates/rate?from=USD&to=EUR');
      newResults.push(`✅ API Rate: ${JSON.stringify(data)}`);
    } catch (error: any) {
      newResults.push(`❌ API Failed: ${error.message}`);
    }

    // Test 3: Exchange rate through service
    try {
      newResults.push('\nTesting Exchange Rate Service...');
      const rate = await ExchangeRateService.getRate('USD', 'EUR');
      newResults.push(`✅ Service Rate: ${rate}`);
    } catch (error: any) {
      newResults.push(`❌ Service Failed: ${error.message}`);
    }

    // Test 4: Direct fetch without auth
    try {
      newResults.push('\nTesting Direct Fetch...');
      const response = await fetch('http://192.168.1.8:3000/api/v1/exchange-rates/rate?from=USD&to=EUR');
      const text = await response.text();
      newResults.push(`✅ Direct Response: ${text}`);
    } catch (error: any) {
      newResults.push(`❌ Direct Failed: ${error.message}`);
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <TouchableOpacity
        onPress={runDiagnostics}
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
          Run Detailed Diagnostics
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      {results.map((result, index) => (
        <Text key={index} style={{ marginBottom: 5, fontFamily: 'monospace' }}>
          {result}
        </Text>
      ))}
    </ScrollView>
  );
}; 