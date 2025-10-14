"use client";

import { Container, Box, Typography } from "@mui/material";

export default function PageShell({
  title,
  children,
  maxWidth = "lg" as const,
}: {
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <>
      <Container maxWidth={maxWidth} sx={{ py: 4, minHeight: 'calc(100vh - 120px)' }}>
        <h1
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: "2rem",
            fontWeight: 500,
          }}
        >
          {title}
        </h1>
        {children}
      </Container>
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
          © {new Date().getFullYear()} Atelier Vélo+ - Upgraded Bikes | Jérôme Leyssard - Tous droits réservés
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
          Logiciel propriétaire protégé par le droit d'auteur
        </Typography>
      </Box>
    </>
  );
}
