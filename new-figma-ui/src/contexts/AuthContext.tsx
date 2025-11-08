import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  acceptInvite: (token: string, name: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<string, { password: string; user: User }> = {
  'cfo@example.com': {
    password: 'password',
    user: { id: '1', email: 'cfo@example.com', name: 'CFO User', role: 'cfo' }
  },
  'admin@example.com': {
    password: 'password',
    user: { id: '2', email: 'admin@example.com', name: 'Admin User', role: 'admin' }
  },
  'auditor@example.com': {
    password: 'password',
    user: { id: '3', email: 'auditor@example.com', name: 'Auditor User', role: 'auditor' }
  },
  'audithead@example.com': {
    password: 'password',
    user: { id: '4', email: 'audithead@example.com', name: 'Audit Head', role: 'audit_head' }
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const mockUser = mockUsers[email];
    if (mockUser && mockUser.password === password) {
      setUser(mockUser.user);
      localStorage.setItem('user', JSON.stringify(mockUser.user));
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const acceptInvite = async (token: string, name: string, password: string) => {
    // Mock invite acceptance
    const newUser: User = {
      id: Date.now().toString(),
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      name,
      role: 'auditee'
    };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, acceptInvite, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
