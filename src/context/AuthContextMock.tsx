import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email?: string;
  isGuest: boolean;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isPreparing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  // Дополнительные методы для совместимости с AuthScreen
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: 'mock-user-id',
    email: 'mock@example.com',
    isGuest: false,
    displayName: 'Mock User'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const signIn = async (email: string, password: string) => {
    console.log('Mock: signIn', email);
    setUser({
      id: 'mock-user-id',
      email,
      isGuest: false,
      displayName: 'Mock User'
    });
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    console.log('Mock: signUp', email);
    setUser({
      id: 'mock-user-id',
      email,
      isGuest: false,
      displayName: displayName || 'Mock User'
    });
  };

  const signOut = async () => {
    console.log('Mock: signOut');
    setUser(null);
  };

  const signInAsGuest = async () => {
    console.log('Mock: signInAsGuest');
    setUser({
      id: 'mock-guest-id',
      isGuest: true,
      displayName: 'Guest User'
    });
  };

  const deleteAccount = async () => {
    console.log('Mock: deleteAccount');
    setUser(null);
  };

  // Дополнительные методы для совместимости с AuthScreen
  const login = signIn; // Алиас для signIn
  const register = signUp; // Алиас для signUp
  const loginAsGuest = signInAsGuest; // Алиас для signInAsGuest
  const logout = signOut; // Алиас для signOut

  const value: AuthContextType = {
    user,
    isLoading,
    isPreparing,
    signIn,
    signUp,
    signOut,
    signInAsGuest,
    deleteAccount,
    login,
    register,
    loginAsGuest,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
