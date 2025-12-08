/**
 * TanStack Query Configuration
 * 
 * Setup central pour React Query avec configuration par défaut
 * pour l'app Atelier Vélo+
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache pendant 5 minutes par défaut
      staleTime: 1000 * 60 * 5,
      
      // Garde en cache pendant 10 minutes
      gcTime: 1000 * 60 * 10,
      
      // Retry intelligent: max 3 fois, mais pas sur erreurs 4xx (client errors)
      retry: (failureCount, error) => {
        // Ne jamais retry sur erreurs 4xx (bad request, unauthorized, etc.)
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status: number }).status;
          if (status >= 400 && status < 500) {
            return false; // Pas de retry sur erreurs client
          }
        }
        
        // Retry max 3 fois sur erreurs 5xx (serveur) ou réseau
        return failureCount < 3;
      },
      
      // Exponential backoff: 1s, 2s, 4s (intégré par défaut)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus pour données toujours fraîches
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Pas de refetch on mount si données fraîches
      refetchOnMount: false,
    },
    mutations: {
      // Retry 0 fois pour mutations (éviter doublons)
      retry: 0,
    },
  },
})
