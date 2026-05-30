"use client";

import React, { memo } from "react";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// LicenseBanner supprimé - GlobalTrialBanner déjà affiché globalement dans providers.tsx

interface PageShellProps {
  title: string;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  headerColor?: string;
}

/**
 * PageShell - Layout de page principal
 * Optimisé avec React.memo pour éviter les re-renders inutiles
 */
const PageShell = memo(function PageShell({
  title,
  children,
  maxWidth = "xl" as const,
  headerColor,
}: PageShellProps) {
  return (
    <>
      <ResponsiveContainer maxWidth={maxWidth} sx={{ py: 4, minHeight: 'calc(100vh - 120px)' }}>
        <h1
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: "2rem",
            fontWeight: 500,
            color: headerColor,
            borderBottom: headerColor ? `3px solid ${headerColor}` : undefined,
            paddingBottom: headerColor ? '8px' : undefined,
          }}
        >
          {title}
        </h1>
        {/* LicenseBanner supprimé - GlobalTrialBanner déjà affiché globalement */}
        {children}
      </ResponsiveContainer>
      <Box 
        component="footer" 
        sx={{ 
          py: 2, 
          px: 3, 
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} Atelier Vélo+ — Upgraded Bikes
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
          Logiciel propriétaire protégé
        </Typography>
      </Box>
    </>
  );
});

export default PageShell;
