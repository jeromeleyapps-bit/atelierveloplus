"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode, useState, createContext, useContext, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBanner from "./components/NavBanner";
import { AuthProvider } from "./auth/AuthContext";
import { lightTheme, darkTheme } from "@/theme/theme";
import GlobalTextFieldEnhancer from "@/components/GlobalTextFieldEnhancer";
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { RepairTimerProvider } from '@/contexts/RepairTimerContext';
import RepairTimerBar from '@/components/RepairTimerBar';
import EmotionCacheProvider from './EmotionCache';
import GlobalTrialBanner from './components/GlobalTrialBanner';

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
  // Initialiser à false pour éviter hydration mismatch (SSR = false, client = sera mis à jour)
  const [isPublicDomain, setIsPublicDomain] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Si le hostname est rdv.upgradedbikes.com (sous-domaine public)
      setIsPublicDomain(hostname === 'rdv.upgradedbikes.com');
    }
  }, []);
  
  // Masquer le NavBanner sur /rdv ET domaine public ET pages auth
  // Utiliser directement false sur SSR pour cohérence
  const isAuthPage = pathname?.startsWith('/auth/');
  const shouldShowNavBanner = !((pathname === '/rdv' || pathname === '/booking-local') && isPublicDomain) && !isAuthPage;

  return (
    <EmotionCacheProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalTextFieldEnhancer />
            <AuthProvider>
              {!isAuthPage && (
                <RepairTimerProvider>
                  <RepairTimerBar />
                  {shouldShowNavBanner && <NavBanner />}
                  {shouldShowNavBanner && <GlobalTrialBanner />}
                  {children}
                </RepairTimerProvider>
              )}
              {isAuthPage && children}
            </AuthProvider>
          </ThemeProvider>
        </ThemeContext.Provider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </EmotionCacheProvider>
  );
}
