"use client";

import React, { memo } from "react";
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * SectionCard - Composant de section réutilisable
 * Optimisé avec React.memo pour éviter les re-renders inutiles
 */
const SectionCard = memo(function SectionCard({
  title,
  icon,
  actions,
  children,
  sx,
}: SectionCardProps) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, ...sx }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Stack>
        {actions ? <Box>{actions}</Box> : null}
      </Stack>
      <Box>
        {children}
      </Box>
    </Paper>
  );
});

export default SectionCard;
