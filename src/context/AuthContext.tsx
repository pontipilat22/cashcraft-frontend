import React, { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  onLogout?: () => void;
}

const AuthContext = createContext<AuthContextType>({});

export const AuthProvider: React.FC<{ children: ReactNode; onLogout?: () => void }> = ({ 
  children, 
  onLogout 
}) => {
  return (
    <AuthContext.Provider value={{ onLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
}; 