// done
'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrentUser, logout as logoutAction } from '@/actions/auth';
import { ActionResponse } from '@/interfaces';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  rollNumber?: string;
  sportsExperience?: string[];
  role: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res: ActionResponse<User> = await getCurrentUser();
      if (res.success) {
        setUser(res.data || null);
      } else {
        setUser(null);
      }
    }
    catch (err) {
      console.error("Error fetching user:", err);
      setUser(null);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async (): Promise<void> => {
    await logoutAction();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading, setUser, setLoading }}>
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
