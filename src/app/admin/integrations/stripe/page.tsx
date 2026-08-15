"use client";

import { useCallback, useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import RequireAuth from '@/app/components/RequireAuth';
import { logger } from '@/lib/logger';

interface Connection {
  publishableKey: string;
  accountLabel: string | null;
  livemode: boolean;
  status: string;
  connectedAt: string;
  updatedAt: string;
}

function StripeIntegrationContent() {
  const [conn, setConn] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pk, setPk] = useState('');
  const [sk, setSk] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/stripe');
      const data = await res.json();
      setConn(data.connection);
      if (data.connection) setLabel(data.connection.accountLabel || '');
    } catch (e) {
      logger.error('[stripe] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Déclaré après load : l'effet référençait auparavant une fonction définie plus bas.
  useEffect(() => { load(); }, [load]);

  async function save() {
    setError(null);
    setInfo(null);
    if (!pk || !sk) {
      setError('Renseigne les deux clés.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishableKey: pk.trim(), secretKey: sk.trim(), accountLabel: label.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        const known: Record<string, string> = {
          invalid_publishable_key: 'Clé publique invalide (doit commencer par pk_test_ ou pk_live_).',
          invalid_secret_key: 'Clé secrète invalide (doit commencer par sk_test_, sk_live_, rk_test_ ou rk_live_).',
          mode_mismatch: 'Les clés publique et secrète sont sur des modes différents (test vs live).',
          stripe_rejected: 'Stripe a refusé ces clés. Vérifie qu\'elles sont valides et actives.',
        };
        throw new Error(known[data.error] || data.detail || 'Erreur sauvegarde');
      }
      setInfo('Clés enregistrées et validées par Stripe.');
      setSk(''); // ne pas garder le secret affiché
      setConn(data.connection);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm('Supprimer la configuration Stripe ? Les paiements seront désactivés.')) return;
    await fetch('/api/integrations/stripe', { method: 'DELETE' });
    setConn(null);
    setPk(''); setSk(''); setLabel('');
    setInfo('Configuration supprimée.');
  }

  if (loading) {
    return <Container sx={{ py: 6 }}><CircularProgress /></Container>;
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4" fontWeight={700}>Connexion Stripe</Typography>
          <Typography color="text.secondary">
            Saisis tes clés API Stripe pour encaisser tes clients directement depuis l&apos;app.
          </Typography>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

        {conn && (
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6">Compte configuré</Typography>
                  <Chip label={conn.status === 'active' ? 'Actif' : 'Inactif'} color={conn.status === 'active' ? 'success' : 'default'} size="small" />
                  <Chip
                    label={conn.livemode ? 'Live' : 'Test'}
                    color={conn.livemode ? 'primary' : 'warning'}
                    size="small"
                  />
                </Stack>
                {conn.accountLabel && <Typography variant="body2"><strong>Libellé&nbsp;:</strong> {conn.accountLabel}</Typography>}
                <Typography variant="body2">
                  <strong>Clé publique&nbsp;:</strong>{' '}
                  <code style={{ fontSize: 12 }}>{conn.publishableKey}</code>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Configuré le {new Date(conn.connectedAt).toLocaleString('fr-FR')} — mis à jour le {new Date(conn.updatedAt).toLocaleString('fr-FR')}
                </Typography>
                <Stack direction="row" spacing={2} pt={1}>
                  <Button variant="outlined" color="error" onClick={disconnect}>Supprimer la configuration</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{conn ? 'Mettre à jour' : 'Configurer'}</Typography>
              <Typography variant="body2" color="text.secondary">
                Récupère tes clés sur le <Link href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">dashboard Stripe</Link>.
                Pour limiter le risque, crée une <strong>Restricted key</strong> (rk_…) avec les permissions
                «&nbsp;Charges write&nbsp;» et «&nbsp;Customers write&nbsp;».
              </Typography>

              <TextField
                label="Clé publique (pk_test_… ou pk_live_…)"
                value={pk}
                onChange={(e) => setPk(e.target.value)}
                fullWidth
              />
              <TextField
                label="Clé secrète (sk_… ou rk_…)"
                type="password"
                value={sk}
                onChange={(e) => setSk(e.target.value)}
                fullWidth
                helperText="Stockée chiffrée. Jamais transmise en clair."
              />
              <TextField
                label="Libellé (optionnel)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                fullWidth
                placeholder="Ex. Atelier rue de la Paix"
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={save} disabled={saving}>
                  {saving ? <CircularProgress size={22} /> : 'Valider et enregistrer'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

export default function StripeIntegrationPage() {
  return (
    <RequireAuth>
      <StripeIntegrationContent />
    </RequireAuth>
  );
}
