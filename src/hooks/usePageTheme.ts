"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { detectThemeFromPath, getPageTheme, type PageTheme, type ThemeColors } from "@/lib/theme-colors";

/**
 * Hook pour obtenir le thème de couleur de la page actuelle
 * Détecte automatiquement depuis l'URL
 */
export function usePageTheme(overrideTheme?: PageTheme): ThemeColors {
  const pathname = usePathname();
  
  const theme = useMemo(() => {
    if (overrideTheme) return overrideTheme;
    return detectThemeFromPath(pathname);
  }, [pathname, overrideTheme]);

  return getPageTheme(theme);
}
