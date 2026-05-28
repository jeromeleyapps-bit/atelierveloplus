"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import RequireAuth from '@/app/components/RequireAuth';
import { logger } from '@/lib/logger';

interface ConnectionState {
  mode: 'test' | 'live';
  connection: {
    stripeAccountId: string;
    livemode: boolean;
    scope: string | null;
    status: string;
    connectedAt: string;
  } | null;
}

function StripeIntegrationContent() {
  const params = useSearchParams();
  const [state, setState] = useState<ConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('connected') === '1') {
      setInfo('Compte Stripe connecté avec succès.');
    }
    const urlError = params.get('error');
    if (urlError) setError(`Erreur OAuth Stripe : ${urlError}`);
    load();
  }, [params]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/stripe');
      const data = await res.json();
      setState(data);
    } catch (e) {
      logger.error('[stripe-admin] load failed', e);
    } finally {
      setLoading(false);
    }
  }

  async function startConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/stripe/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.detail || data.error || 'connect_failed');
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!confirm('Déconnecter ton compte Stripe ? Les paiements seront désactivés.')) return;
    await fetch('/api/integrations/stripe', { method: 'DELETE' });
    setInfo('Compte déconnecté.');
    load();
  }

  if (loading) {
    return (
      <Container sx={{ py: 6 }}>
        <CircularProgress />
      </Container>
    );
  }

  const isConnected = state?.connection && state.connection.status === 'active';

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4" fontWeight={700}>
            Connexion Stripe
          </Typography>
          <Typography color="text.secondary">
            Connecte ton compte Stripe pour encaisser tes clients directement depuis Atelier Vélo+.
          </Typography>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6">Statut</Typography>
                {isConnected ? (
                  <Chip label="Connecté" color="success" size="small" />
                ) : (
                  <Chip label="Non connecté" color="default" size="small" />
                )}
                <Chip
                  label={`Mode ${state?.mode || 'test'}`}
                  size="small"
                  color={state?.mode === 'live' ? 'primary' : 'warning'}
                />
              </Stack>

              {isConnected && state?.connection && (
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Compte Stripe :</strong> {state.connection.stripeAccountId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Mode du compte :</strong> {state.connection.livemode ? 'live' : 'test'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Connecté le :</strong>{' '}
                    {new Date(state.connection.connectedAt).toLocaleString('fr-FR')}
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" spacing={2}>
                {!isConnected ? (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={startConnect}
                    disabled={connecting}
                  >
                    {connecting ? <CircularProgress size={22} /> : 'Connecter mon compte Stripe'}
                  </Button>
                ) : (
                  <Button variant="outlined" color="error" onClick={disconnect}>
                    Déconnecter
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Comment ça marche
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clic sur &laquo;&nbsp;Connecter&nbsp;&raquo;, tu es redirigé vers Stripe.
              Tu te connectes avec ton compte Stripe (ou tu en crées un gratuitement).
              Tu autorises Atelier Vélo+ à créer des paiements à ta place. Tu reviens dans l&apos;app, c&apos;est prêt.
              Aucune clé API à copier-coller.
            </Typography>
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
