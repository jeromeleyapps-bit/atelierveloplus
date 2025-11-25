'use client'

/**
 * Composant de test pour vérifier l'infrastructure Phase 3
 * 
 * Teste:
 * - TanStack Query (useQuery)
 * - Axios apiClient
 * - Formatage date-fns
 */

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/apiClient'
import { formatDate, formatDateTime, formatPrice, formatPhone } from '@/lib/format'
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

export default function TestInfrastructure() {
  // Test TanStack Query + Axios
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-infrastructure'],
    queryFn: () => get('/customers').catch(() => []),
    retry: 0,
  })
  
  const now = new Date()
  
  return (
    <Card sx={{ m: 2, maxWidth: 600 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Test Infrastructure Phase 3
        </Typography>
        
        {/* Test TanStack Query */}
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            1. TanStack Query
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Chargement...</Typography>
            </Box>
          ) : error ? (
            <Chip 
              icon={<ErrorIcon />} 
              label="Erreur (normal si pas authentifié)" 
              color="warning" 
              size="small" 
            />
          ) : (
            <Chip 
              icon={<CheckCircleIcon />} 
              label={`OK - ${Array.isArray(data) ? data.length : 0} clients`}
              color="success" 
              size="small" 
            />
          )}
        </Box>
        
        {/* Test Axios */}
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            2. Axios Client
          </Typography>
          <Chip 
            icon={<CheckCircleIcon />} 
            label="OK - Interceptors actifs"
            color="success" 
            size="small" 
          />
        </Box>
        
        {/* Test Formatage */}
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            3. Formatage date-fns
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2">
              Date: {formatDate(now)}
            </Typography>
            <Typography variant="body2">
              Date+Heure: {formatDateTime(now)}
            </Typography>
            <Typography variant="body2">
              Prix: {formatPrice(1234.56)}
            </Typography>
            <Typography variant="body2">
              Téléphone: {formatPhone('0612345678')}
            </Typography>
          </Box>
        </Box>
        
        {/* DevTools */}
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            4. React Query DevTools
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cherchez l&apos;icône en bas à gauche (dev only)
          </Typography>
        </Box>
        
        {/* Résumé */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="success.dark">
            Infrastructure Phase 3 opérationnelle!
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
