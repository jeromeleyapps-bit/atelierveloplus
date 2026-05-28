"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { logger } from '@/lib/logger';

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'unknown'>('loading');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('unknown');
      return;
    }
    fetch(`/api/billing/order-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        setStatus(d.status === 'paid' ? 'paid' : 'pending');
        setEmail(d.customerEmail || '');
      })
      .catch(e => {
        logger.error('[tarifs/success] status fetch failed', e);
        setStatus('unknown');
      });
  }, [sessionId]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        {status === 'loading' && <CircularProgress />}

        {status === 'paid' && (
          <>
            <Typography variant="h4" fontWeight={700}>
              Merci, paiement confirmé.
            </Typography>
            <Typography color="text.secondary">
              Ta clé de licence a été envoyée à <strong>{email || 'ton email'}</strong>.
              Si tu ne la trouves pas, vérifie tes spams.
            </Typography>
            <Alert severity="info">
              Active ta licence dans l&apos;app : Paramètres → Licence → Coller la clé.
            </Alert>
          </>
        )}

        {status === 'pending' && (
          <>
            <Typography variant="h5" fontWeight={700}>
              Paiement reçu, génération de licence en cours…
            </Typography>
            <Typography color="text.secondary">
              Stripe nous a confirmé le paiement. Ta clé arrive par email d&apos;ici quelques secondes.
            </Typography>
            <CircularProgress />
          </>
        )}

        {status === 'unknown' && (
          <Alert severity="warning">
            Session inconnue. Si tu as bien été débité, contacte le support.
          </Alert>
        )}

        <Button href="/tarifs" variant="text">Retour aux tarifs</Button>
      </Stack>
    </Container>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <SuccessInner />
    </Suspense>
  );
}
