"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode, useState, createContext, useContext, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBanner from "./components/NavBanner";
import { AuthProvider } from "./auth/AuthContext";
import { lightTheme, darkTheme } from "@/theme/theme";

// Context pour le mode sombre
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function AppProviders({ children }: { children: ReactNode }) {
  // Récupérer le mode depuis localStorage (avec protection SSR)
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    // Récupérer le mode sauvegardé uniquement côté client
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode') as ThemeMode;
      if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
        setMode(savedMode);
      }
    }
  }, []);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', newMode);
      }
      return newMode;
    });
  };

  const theme = useMemo(
    () => (mode === 'light' ? lightTheme : darkTheme),
    [mode]
  );

  const pathname = usePathname();
  
  // Détecter si on est sur le domaine public (tunnel Cloudflare)
  const [isPublicDomain, setIsPublicDomain] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Si le hostname est rdv.upgradedbikes.com (sous-domaine public)
      setIsPublicDomain(hostname === 'rdv.upgradedbikes.com');
    }
  }, []);
  
  // Masquer le NavBanner sur /rdv ET domaine public, ou tant que isPublicDomain n'est pas initialisé
  const shouldShowNavBanner = isPublicDomain !== null && !((pathname === '/rdv' || pathname === '/booking-local') && isPublicDomain);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          {shouldShowNavBanner && <NavBanner />}
          {children}
        </AuthProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
