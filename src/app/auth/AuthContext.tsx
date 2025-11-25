"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authLogin, authRegister } from "@/lib/api";
import { logger } from '@/lib/logger';

export type AuthUser = {
  id: string;
  email?: string;
  shopName?: string;
};

export type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    shopName?: string;
    isAutoEntrepreneur?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    logger.info('[AUTH] AuthContext initializing');
    // Load from localStorage after mount to avoid SSR/CSR mismatch
    const token = window.localStorage.getItem("jwt_token");
    const userStr = window.localStorage.getItem("user");
    logger.info('[AUTH] Token exists:', !!token);
    logger.info('[AUTH] User data exists:', !!userStr);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        logger.info('[AUTH] Setting user:', user.email);
        setUser({ id: user.id, email: user.email, shopName: user.shopName });
      } catch (_e) {
        logger.info('[AUTH] Invalid user data - clearing');
        // Invalid user data, clear
        window.localStorage.removeItem("jwt_token");
        window.localStorage.removeItem("user");
      }
    } else {
      logger.info('[AUTH] No token or user data - user is null');
    }
    setReady(true);
    logger.info('[AUTH] AuthContext ready');
    
    // Écouter les événements de déconnexion depuis api.ts
    const handleStorageChange = () => {
      const token = window.localStorage.getItem("jwt_token");
      if (!token) {
        // Token supprimé → déconnecter
        setUser(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Événement custom pour déconnexion dans le même onglet
    window.addEventListener('auth:logout', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleStorageChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authLogin({ email, password });
    // Store JWT token
    window.localStorage.setItem("jwt_token", response.token);
    window.localStorage.setItem("user", JSON.stringify(response.user));
    setUser({ id: response.user.id, email: response.user.email });
  };

  const register = async (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    shopName?: string;
    isAutoEntrepreneur?: boolean;
  }) => {
    const response = await authRegister(input);
    logger.info('[AuthContext] Register response:', response);
    logger.info('[AuthContext] Has token?', 'token' in response);
    logger.info('[AuthContext] Has user?', 'user' in response);
    
    // Register now returns token - auto-login
    if ('token' in response && 'user' in response) {
      logger.info('[AuthContext] Storing token in localStorage');
      window.localStorage.setItem("jwt_token", response.token);
      window.localStorage.setItem("user", JSON.stringify(response.user));
      setUser({ id: response.user.id, email: response.user.email, shopName: response.user.shopName });
      logger.info('[AuthContext] Token stored, user set');
    } else {
      logger.info('[AuthContext] Using fallback (old format)');
      // Fallback for old response format
      window.localStorage.setItem("user", JSON.stringify({ id: response.id, email: response.email, shopName: response.shopName }));
      setUser({ id: response.id, email: response.email, shopName: response.shopName });
    }
  };

  const logout = async () => {
    window.localStorage.removeItem("jwt_token");
    window.localStorage.removeItem("user");
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ready, user, login, register, logout }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
