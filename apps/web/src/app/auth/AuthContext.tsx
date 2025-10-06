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
    const uid = window.localStorage.getItem("auth:userId");
    const email = window.localStorage.getItem("auth:email") || undefined;
    const shopName = window.localStorage.getItem("auth:shopName") || undefined;
    if (uid) setUser({ id: uid, email, shopName });
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const u = await authLogin({ email, password });
    window.localStorage.setItem("auth:userId", u.id);
    window.localStorage.setItem("auth:email", u.email);
    const shopName = window.localStorage.getItem("auth:shopName") || undefined;
    setUser({ id: u.id, email: u.email, shopName });
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
    // After registration, auto-login client-side by storing headers
    window.localStorage.setItem("auth:userId", u.id);
    window.localStorage.setItem("auth:email", u.email);
    if (u.shopName) window.localStorage.setItem("auth:shopName", u.shopName);
    setUser({ id: u.id, email: u.email, shopName: u.shopName });
  };

  const logout = async () => {
    window.localStorage.removeItem("auth:userId");
    window.localStorage.removeItem("auth:email");
    window.localStorage.removeItem("auth:shopName");
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
