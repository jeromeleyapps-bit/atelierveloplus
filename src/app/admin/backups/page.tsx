"use client";

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import RestoreIcon from '@mui/icons-material/Restore';
import CircularProgress from '@mui/material/CircularProgress';
import RequireAuth from '@/app/components/RequireAuth';
import { logger } from '@/lib/logger';

interface Backup {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function BackupsContent() {
  const [list, setList] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      const data = await res.json();
      setList(data.backups || []);
    } catch (e) {
      logger.error('[backups] load failed', e);
      setError('Impossible de charger la liste');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createOne() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur création');
      setInfo(`Sauvegarde créée : ${data.filename} (${fmtBytes(data.sizeBytes)})`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setCreating(false);
    }
  }

  async function restore(filename: string) {
    if (!confirm(`Restaurer "${filename}" ? La base actuelle sera remplacée (une copie de sécurité sera créée automatiquement).`)) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur restauration');
      setInfo(data.message || 'Restauration appliquée');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>Sauvegardes</Typography>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Une sauvegarde automatique est créée chaque nuit à 3h. Tu peux aussi en créer une manuellement.
                La rotation garde les 30 dernières. Les fichiers sont compressés (.db.gz) dans le dossier <code>backups/</code> de l&apos;application.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={createOne} disabled={creating}>
                  {creating ? <CircularProgress size={22} /> : 'Sauvegarder maintenant'}
                </Button>
                <Button variant="text" onClick={load}>Rafraîchir</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historique ({list.length})
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : list.length === 0 ? (
              <Typography color="text.secondary">Aucune sauvegarde pour l&apos;instant.</Typography>
            ) : (
              <List dense>
                {list.map((b) => (
                  <ListItem
                    key={b.filename}
                    divider
                    secondaryAction={
                      <IconButton edge="end" title="Restaurer" onClick={() => restore(b.filename)}>
                        <RestoreIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={b.filename}
                      secondary={`${new Date(b.createdAt).toLocaleString('fr-FR')} — ${fmtBytes(b.sizeBytes)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

export default function BackupsPage() {
  return (
    <RequireAuth>
      <BackupsContent />
    </RequireAuth>
  );
}
