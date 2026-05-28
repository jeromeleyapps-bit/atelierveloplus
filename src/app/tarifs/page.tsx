"use client";

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import { PRICING_TIERS } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  async function handleCheckout(tier: string) {
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Renseigne ton email avant de continuer.');
      return;
    }
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Impossible de démarrer le paiement');
      }
      window.location.href = data.url;
    } catch (e) {
      logger.error('[pricing] checkout error', e);
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
      setLoadingTier(null);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={1} alignItems="center" textAlign="center" mb={6}>
        <Typography variant="h3" fontWeight={700}>
          Atelier Vélo+
        </Typography>
        <Typography variant="h5" color="text.secondary">
          Une licence, pas d&apos;abonnement. Vous achetez, vous gardez.
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={620} mt={2}>
          14 jours d&apos;essai complet inclus dans toutes les formules. Aucune carte requise pour démarrer.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Box mb={4} maxWidth={420} mx="auto">
        <Typography variant="body2" gutterBottom>
          Email où recevoir ta clé de licence après paiement :
        </Typography>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.fr"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 16,
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent="center"
        alignItems="stretch"
      >
        {PRICING_TIERS.map((p) => (
          <Card
            key={p.tier}
            elevation={p.highlighted ? 8 : 2}
            sx={{
              flex: 1,
              maxWidth: 360,
              border: p.highlighted ? '2px solid' : '1px solid',
              borderColor: p.highlighted ? 'primary.main' : 'divider',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h5" fontWeight={700}>
                  {p.label}
                </Typography>
                {p.highlighted && <Chip label="Recommandé" color="primary" size="small" />}
              </Stack>
              <Box mb={2}>
                <Typography variant="h3" component="span" fontWeight={700}>
                  {p.priceEUR} €
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary" ml={1}>
                  / {p.period}
                </Typography>
              </Box>
              <List dense sx={{ flex: 1 }}>
                {p.bullets.map((b) => (
                  <ListItem key={b} disableGutters>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={b} />
                  </ListItem>
                ))}
              </List>
              <Button
                fullWidth
                size="large"
                variant={p.highlighted ? 'contained' : 'outlined'}
                onClick={() => handleCheckout(p.tier)}
                disabled={loadingTier !== null}
                sx={{ mt: 2 }}
              >
                {loadingTier === p.tier ? <CircularProgress size={22} /> : p.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Stack mt={6} spacing={1} alignItems="center" textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Paiement sécurisé Stripe. TVA non applicable, art. 293 B du CGI.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Déjà acheté ? Ta clé arrive par email après confirmation Stripe — colle-la dans Paramètres → Licence.
        </Typography>
      </Stack>
    </Container>
  );
}
