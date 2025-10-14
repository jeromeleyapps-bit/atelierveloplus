"use client";

import { useState } from "react";
import { Box, Button, Paper, Typography, Alert, Stack } from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ [key: string]: string }>({});

  // Afficher les données actuelles
  const showCurrentCache = () => {
    const info: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        info[key] = value ? (value.length > 50 ? value.substring(0, 50) + "..." : value) : "";
      }
    }
    setCacheInfo(info);
  };

  const handleClear = () => {
    // Nettoyer localStorage
    localStorage.clear();
    
    // Nettoyer sessionStorage
    sessionStorage.clear();
    
    setCleared(true);
    setCacheInfo({});
    
    // Rediriger vers login après 2 secondes
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 600,
          width: "100%",
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ textAlign: "center" }}>
            <DeleteSweepIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Nettoyer le Cache
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supprime toutes les données stockées localement
            </Typography>
          </Box>

          {cleared ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Cache nettoyé avec succès ! Redirection vers la page de connexion...
            </Alert>
          ) : (
            <>
              <Alert severity="info">
                Cette action va supprimer :
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>Token d'authentification JWT</li>
                  <li>Données utilisateur</li>
                  <li>Préférences d'interface</li>
                  <li>Tous les autres paramètres locaux</li>
                </ul>
              </Alert>

              {Object.keys(cacheInfo).length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Données actuellement stockées :
                  </Typography>
                  {Object.entries(cacheInfo).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block" sx={{ fontFamily: "monospace" }}>
                      <strong>{key}:</strong> {value}
                    </Typography>
                  ))}
                </Paper>
              )}

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={showCurrentCache}
                  disabled={cleared}
                >
                  Voir les données
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleClear}
                  disabled={cleared}
                  size="large"
                >
                  Nettoyer et Se Déconnecter
                </Button>
              </Stack>

              <Alert severity="warning">
                ⚠️ Vous serez déconnecté et redirigé vers la page de connexion.
              </Alert>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
