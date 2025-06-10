import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  updateProfile
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

const USER_KEY = "@cashcraft_user";

export interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

class AuthService {
  // Сохранение данных пользователя в AsyncStorage
  async saveUserToStorage(user: User): Promise<void> {
    try {
      const userData: UserData = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName,
        photoURL: user.photoURL
      };
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Error saving user to storage:", error);
    }
  }

  // Получение данных пользователя из AsyncStorage
  async getUserFromStorage(): Promise<UserData | null> {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error("Error getting user from storage:", error);
      return null;
    }
  }

  // Удаление данных пользователя из AsyncStorage
  async removeUserFromStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error("Error removing user from storage:", error);
    }
  }

  // Регистрация нового пользователя
  async register(email: string, password: string, displayName: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Обновляем профиль пользователя
      await updateProfile(user, { displayName });

      // Сохраняем данные пользователя в Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Сохраняем в AsyncStorage
      await this.saveUserToStorage(user);

      return user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // Вход пользователя
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Сохраняем в AsyncStorage
      await this.saveUserToStorage(user);

      return user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Выход пользователя
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      await this.removeUserFromStorage();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Проверка существования сессии
  async checkAuthState(): Promise<UserData | null> {
    try {
      // Сначала проверяем AsyncStorage
      const storedUser = await this.getUserFromStorage();
      
      if (storedUser) {
        // Проверяем, существует ли пользователь в Firestore
        const userDoc = await getDoc(doc(db, "users", storedUser.uid));
        if (userDoc.exists()) {
          return storedUser;
        } else {
          // Если пользователя нет в базе, очищаем локальное хранилище
          await this.removeUserFromStorage();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Check auth state error:", error);
      return null;
    }
  }
}

export default new AuthService(); 