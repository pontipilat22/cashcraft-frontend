import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebase/firebaseConfig';

export const DebugInfo: React.FC = () => {
  const [asyncStorageUser, setAsyncStorageUser] = useState<string>('Loading...');
  const [firebaseUser, setFirebaseUser] = useState<string>('Loading...');
  
  useEffect(() => {
    const checkStatus = async () => {
      // Проверяем AsyncStorage
      try {
        const user = await AsyncStorage.getItem('currentUser');
        setAsyncStorageUser(user ? 'Found: ' + JSON.parse(user).email : 'No user in AsyncStorage');
      } catch (error) {
        setAsyncStorageUser('Error reading AsyncStorage: ' + error);
      }
      
      // Проверяем Firebase Auth
      try {
        const currentUser = auth.currentUser;
        setFirebaseUser(currentUser ? 'Firebase user: ' + currentUser.email : 'No Firebase user');
      } catch (error) {
        setFirebaseUser('Firebase error: ' + error);
      }
    };
    
    checkStatus();
    
    // Обновляем каждую секунду
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Info:</Text>
      <Text style={styles.text}>AsyncStorage: {asyncStorageUser}</Text>
      <Text style={styles.text}>Firebase: {firebaseUser}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 5,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
}); 