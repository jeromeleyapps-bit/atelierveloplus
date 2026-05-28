"use client";

import { useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import RequireAuth from '@/app/components/RequireAuth';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayThisYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function ExportsContent() {
  const [from, setFrom] = useState(firstDayThisYear());
  const [to, setTo] = useState(isoToday());
  const [error, setError] = useState<string | null>(null);

  const downloadUrl = useMemo(
    () => `/api/exports/fec?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    [from, to],
  );

  function validateAndDownload() {
    setError(null);
    const f = new Date(from);
    const t = new Date(to);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
      setError('Dates invalides');
      return;
    }
    if (f > t) {
      setError('La date de début doit être avant la date de fin');
      return;
    }
    window.location.href = downloadUrl;
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Exports comptables
        </Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Fichier des Écritures Comptables (FEC)</Typography>
              <Typography variant="body2" color="text.secondary">
                Format normé art. A47 A-1 LPF, requis par l&apos;administration fiscale.
                Sélectionne une période, télécharge le fichier, transmets-le à ton comptable.
              </Typography>

              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Du"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Au"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={validateAndDownload}>
                  Télécharger le FEC
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

export default function ExportsPage() {
  return (
    <RequireAuth>
      <ExportsContent />
    </RequireAuth>
  );
}
