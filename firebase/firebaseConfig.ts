// firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ Твой новый Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB-ZP0kJMi92yzxf3F7J-2ZWqgRauRfXT4",
  authDomain: "cashcraft-b9781.firebaseapp.com",
  projectId: "cashcraft-b9781",
  storageBucket: "cashcraft-b9781.appspot.com", // ❗ Исправил .app -> .appspot.com
  messagingSenderId: "475144195261",
  appId: "1:475144195261:web:917f0d7c24a647b8fefbd4"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Сервисы
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app as firebaseApp };
