"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Toolbar, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import Link from "next/link";

// This page embeds SimplyBook's public booking widget via a configurable URL.
// You can paste your public booking page URL into the field and click "Ouvrir" or "Intégrer".
// For a permanent setup, store the URL in settings key: simplybook.publicUrl

export default function BookingSimplyBookPage() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    // If you decide to persist a default URL, you can fetch it from /api/settings/simplybook.publicUrl here.
    (async () => {
      try {
        const r = await fetch("/api/settings/simplybook.publicUrl");
        if (r.ok) {
          const j = await r.json();
          if (j?.value) setUrl(String(j.value));
        }
      } catch {}
    })();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Toolbar disableGutters sx={{ mb: 2, gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="h5">Réserver en ligne — SimplyBook.it</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="contained" color="primary" startIcon={<OpenInNewIcon />} href={url || undefined} target="_blank" rel="noopener noreferrer" disabled={!url}>
            Ouvrir la page publique
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!url}
          >
            Actualiser l&apos;aperçu
          </Button>
        </Stack>
      </Toolbar>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField size="small" fullWidth label="URL publique SimplyBook" placeholder="https://votre-espace.simplybook.it/v2/" value={url} onChange={(e) => setUrl(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" onClick={async () => {
              try {
                await fetch("/api/settings/simplybook.publicUrl", { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: url || null }) });
              } catch {}
            }} disabled={!url}>Enregistrer l&apos;URL par défaut</Button>
            <Button component={Link} href={url || "#"} target="_blank" rel="noopener noreferrer" variant="text" disabled={!url}>Tester dans un nouvel onglet</Button>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Endpoints SimplyBook pour intégration avancée:
          JSON-RPC: https://user-api.simplybook.it/ — REST: https://user-api-v2.simplybook.it/
        </Typography>
      </Paper>

      {!url && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Renseignez l&apos;URL publique SimplyBook de votre agenda pour afficher le widget ci-dessous.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 1 }}>
        {blocked && (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              L’affichage intégré peut être limité par le site externe. Utilisez le bouton « Ouvrir la page publique » si l’aperçu ne s’affiche pas correctement.
            </Typography>
          </Box>
        )}
        <Box sx={{ position: 'relative', width: '100%', height: { xs: 640, md: 800 } }}>
          {url ? (
            <iframe
              key={reloadKey}
              ref={frameRef}
              src={url}
              onLoad={() => setBlocked(false)}
              style={{ border: 0, width: '100%', height: '100%' }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">Aucune URL définie pour SimplyBook.</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
