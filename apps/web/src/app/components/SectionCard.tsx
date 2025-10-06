"use client";

import React from "react";
import { Paper, Stack, Typography, Box } from "@mui/material";

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
  sx?: any;
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
