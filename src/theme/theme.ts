/**
 * Custom Theme for Atelier Vélo+
 * Modern, professional, and bike-themed
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Palette personnalisée "Atelier Vélo Moderne"
const lightPalette = {
  primary: {
    main: '#2563eb',      // Bleu moderne (vélo électrique)
    light: '#60a5fa',
    dark: '#1e40af',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#f59e0b',      // Orange (énergie, dynamisme)
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981',      // Vert (écologie, vélo)
    light: '#34d399',
    dark: '#059669',
    contrastText: '#ffffff',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  background: {
    default: '#f8fafc',   // Gris très clair
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a',   // Presque noir
    secondary: '#64748b', // Gris moyen
  },
};

const darkPalette = {
  primary: {
    main: '#60a5fa',      // Bleu plus clair pour le dark mode
    light: '#93c5fd',
    dark: '#3b82f6',
    contrastText: '#0f172a',
  },
  secondary: {
    main: '#fbbf24',      // Orange plus clair
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: '#0f172a',
  },
  success: {
    main: '#34d399',
    light: '#6ee7b7',
    dark: '#10b981',
    contrastText: '#0f172a',
  },
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
  },
  warning: {
    main: '#fbbf24',
    light: '#fcd34d',
    dark: '#f59e0b',
  },
  info: {
    main: '#60a5fa',
    light: '#93c5fd',
    dark: '#3b82f6',
  },
  background: {
    default: '#0f172a',   // Bleu très foncé
    paper: '#1e293b',     // Bleu foncé
  },
  text: {
    primary: '#f1f5f9',   // Blanc cassé
    secondary: '#94a3b8', // Gris clair
  },
};

// Configuration commune
const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none', // Pas de MAJUSCULES automatiques
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12, // Coins arrondis modernes
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
};

// Créer le thème clair
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    ...lightPalette,
  },
});

// Créer le thème sombre
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
});

// Export par défaut : thème clair
export default lightTheme;
