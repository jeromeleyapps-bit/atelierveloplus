"use client";

import React from "react";
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

export default function SectionCard({
  title,
  icon,
  actions,
  children,
  sx,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
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
}
