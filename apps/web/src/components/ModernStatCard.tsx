/**
 * Modern StatCard with gradients and animations
 */

"use client";

import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
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
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Violet
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Rose
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Bleu
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Vert
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Orange
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
