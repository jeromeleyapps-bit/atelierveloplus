"use client";

import { useEffect, useState } from "react";
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import PageShell from "../components/PageShell";
import { logger } from '@/lib/logger';

export default function FixAuthPage() {
  const [fixed, setFixed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = window.localStorage.getItem("auth:userId");
    setCurrentUserId(userId);
  }, []);

  const fixAuth = async () => {
    try {
      // Récupérer le premier utilisateur de la base
      const res = await fetch('/api/users/first');
      if (!res.ok) throw new Error('Failed to fetch user');
      
      const user = await res.json();
      
      // Nettoyer le localStorage
      window.localStorage.clear();
      
      // Définir le bon utilisateur
      window.localStorage.setItem("auth:userId", user.id);
      if (user.email) {
        window.localStorage.setItem("auth:email", user.email);
      }
      
      setFixed(true);
      setCurrentUserId(user.id);
      
      // Rediriger vers settings après 2 secondes
      setTimeout(() => {
        window.location.href = '/settings';
      }, 2000);
    } catch (error) {
      logger.error('Error fixing auth:', error);
      alert('Erreur lors de la correction de l\'authentification');
    }
  };

  return (
    <PageShell title="Correction Authentification" maxWidth="sm">
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h6">
            Correction de l&apos;authentification
          </Typography>
          
          {currentUserId && (
            <Alert severity="warning">
              User ID actuel dans localStorage : <code>{currentUserId}</code>
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary">
            Cette page permet de corriger les problèmes d&apos;authentification en nettoyant
            le localStorage et en utilisant le premier utilisateur disponible dans la base de données.
          </Typography>
          
          {!fixed ? (
            <Button 
              variant="contained" 
              onClick={fixAuth}
              size="large"
            >
              Corriger l&apos;authentification
            </Button>
          ) : (
            <Alert severity="success">
              ✓ Authentification corrigée ! Redirection en cours...
            </Alert>
          )}
        </Stack>
      </Paper>
    </PageShell>
  );
}
