"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authLogin, authRegister } from "@/lib/api";

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
    // Load from localStorage after mount to avoid SSR/CSR mismatch
    const token = window.localStorage.getItem("jwt_token");
    const userStr = window.localStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setUser({ id: user.id, email: user.email, shopName: user.shopName });
      } catch (e) {
        // Invalid user data, clear
        window.localStorage.removeItem("jwt_token");
        window.localStorage.removeItem("user");
      }
    }
    setReady(true);
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
    const u = await authRegister(input);
    // After registration, auto-login by fetching token
    // Note: register endpoint should also return token in future
    // For now, store user data and require login
    window.localStorage.setItem("user", JSON.stringify({ id: u.id, email: u.email, shopName: u.shopName }));
    setUser({ id: u.id, email: u.email, shopName: u.shopName });
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
