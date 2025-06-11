import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export class FirebaseAuthService {
  // Регистрация нового пользователя
  static async register(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Обновляем имя пользователя если указано
      if (displayName && user) {
        await updateProfile(user, { displayName });
      }
      
      // Сохраняем информацию о пользователе локально
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        id: user.uid,
        email: user.email,
        displayName: displayName || email.split('@')[0],
        isGuest: false
      }));
      
      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  
  // Вход существующего пользователя
  static async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Сохраняем информацию о пользователе локально
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        id: user.uid,
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        isGuest: false
      }));
      
      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  
  // Выход из системы
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('currentUser');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  
  // Сброс пароля
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  
  // Получить текущего пользователя
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }
  
  // Подписка на изменения состояния авторизации
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
  
  // Вход через Google (упрощенная версия для Expo Go)
  static async loginWithGoogle(idToken: string): Promise<User> {
    try {
      // Создаем credential для Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Входим в Firebase
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      // Сохраняем информацию о пользователе локально
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        isGuest: false
      }));
      
      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  
  // Обработка ошибок Firebase Auth
  private static handleAuthError(error: any): Error {
    let message = 'Произошла ошибка при авторизации';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Этот email уже используется';
        break;
      case 'auth/invalid-email':
        message = 'Неверный формат email';
        break;
      case 'auth/operation-not-allowed':
        message = 'Операция не разрешена';
        break;
      case 'auth/weak-password':
        message = 'Слишком слабый пароль';
        break;
      case 'auth/user-disabled':
        message = 'Пользователь заблокирован';
        break;
      case 'auth/user-not-found':
        message = 'Пользователь не найден';
        break;
      case 'auth/wrong-password':
        message = 'Неверный пароль';
        break;
      case 'auth/network-request-failed':
        message = 'Ошибка сети. Проверьте подключение к интернету';
        break;
      case 'auth/too-many-requests':
        message = 'Слишком много попыток. Попробуйте позже';
        break;
      case 'auth/app-not-authorized':
        message = 'Приложение не авторизовано. Проверьте конфигурацию Firebase';
        break;
      case 'auth/invalid-api-key':
        message = 'Неверный API ключ Firebase';
        break;
      default:
        if (error.message) {
          message = error.message;
        }
    }
    
    return new Error(message);
  }
} 