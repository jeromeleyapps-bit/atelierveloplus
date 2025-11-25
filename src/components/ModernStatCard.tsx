/**
 * Modern StatCard with gradients and animations
 */

"use client";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  gradient?: string;
  trend?: {
    value: number;
    label: string;
  };
}

const defaultGradients = [
  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Bleu vif
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Vert émeraude
  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', // Bleu cyan
  'linear-gradient(135deg, #8b7355 0%, #6d5d4b 100%)', // Marron
];

export default function ModernStatCard({ 
  title, 
  value, 
  icon, 
  gradient,
  trend 
}: ModernStatCardProps) {
  const randomGradient = gradient || defaultGradients[Math.floor(Math.random() * defaultGradients.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        sx={{
          background: randomGradient,
          color: 'white',
          borderRadius: 3,
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
          },
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.9, 
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  {title}
                </Typography>
                <Typography 
                  variant="h3" 
                  fontWeight="bold" 
                  sx={{ mt: 1 }}
                >
                  {value}
                </Typography>
                {trend && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 1, 
                      opacity: 0.9,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <span style={{ 
                      fontSize: '1.2rem',
                      color: trend.value >= 0 ? '#4ade80' : '#f87171'
                    }}>
                      {trend.value >= 0 ? '↗' : '↘'}
                    </span>
                    {Math.abs(trend.value)}% {trend.label}
                  </Typography>
                )}
              </Box>
              <Box 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  borderRadius: 2, 
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {icon}
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Variante simple sans gradient (pour mode sombre)
export function SimpleStatCard({ title, value, icon }: Omit<ModernStatCardProps, 'gradient' | 'trend'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        sx={{
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            transform: 'translateY(-4px)',
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.75rem'
                }}
              >
                {title}
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color="primary"
                sx={{ mt: 1 }}
              >
                {value}
              </Typography>
            </Box>
            <Box 
              sx={{ 
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 2, 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
}
