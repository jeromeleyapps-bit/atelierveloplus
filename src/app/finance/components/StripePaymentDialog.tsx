"use client";

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { logger } from '@/lib/logger';

interface Props {
  open: boolean;
  invoiceId: string;
  invoiceNumber: string;
  customerEmail?: string | null;
  onClose: () => void;
  onPaid?: () => void;
}

interface LinkResp {
  url?: string;
  error?: string;
  detail?: string;
}

export default function StripePaymentDialog({ open, invoiceId, invoiceNumber, customerEmail, onClose, onPaid }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'pending' | 'paid' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open && !link) {
      generate();
    }
    if (!open) {
      // Reset à la fermeture
      setLink(null);
      setStatus(null);
      setError(null);
      setInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}/payment-link`, { method: 'POST' });
      const data: LinkResp = await res.json();
      if (!res.ok || !data.url) {
        const known: Record<string, string> = {
          stripe_not_configured: 'Stripe n\'est pas configuré. Va dans Paramètres → Encaissement Stripe.',
          stripe_decrypt_failed: 'Impossible de déchiffrer les clés Stripe. Reconfigure-les.',
          invoice_not_issued: 'La facture doit être émise avant de générer un lien.',
          already_paid: 'Cette facture est déjà payée.',
        };
        throw new Error(known[data.error || ''] || data.detail || 'Erreur génération du lien');
      }
      setLink(data.url);
      setStatus('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setInfo('Lien copié dans le presse-papiers.');
    } catch {
      setError('Copie impossible. Sélectionne et copie manuellement.');
    }
  }

  async function sendByEmail() {
    if (!link || !customerEmail) return;
    const subject = encodeURIComponent(`Paiement facture ${invoiceNumber}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVoici le lien de paiement pour la facture ${invoiceNumber} :\n${link}\n\nCordialement.`
    );
    window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
  }

  async function checkPayment() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}/check-payment`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'paid') {
        setStatus('paid');
        setInfo('Paiement confirmé par Stripe.');
        onPaid?.();
      } else if (data.status === 'pending') {
        setInfo('Le client n\'a pas encore payé.');
      } else if (data.error) {
        throw new Error(data.detail || data.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur vérification');
      logger.error('[invoice/check-payment] failed', e);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Lien de paiement Stripe — Facture {invoiceNumber}
        {status === 'paid' && <Chip label="Payée" color="success" size="small" sx={{ ml: 2 }} />}
        {status === 'pending' && <Chip label="En attente" color="warning" size="small" sx={{ ml: 2 }} />}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {loading && <CircularProgress />}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

          {link && (
            <>
              <Typography variant="body2" color="text.secondary">
                Envoie ce lien à ton client. Il pourra payer en CB / Apple Pay / Google Pay selon ses méthodes Stripe.
              </Typography>
              <TextField
                fullWidth
                value={link}
                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } }}
                onClick={(e) => (e.target as HTMLInputElement).select?.()}
              />
              <Stack direction="row" spacing={1}>
                <Button onClick={copyLink} variant="outlined">Copier</Button>
                <Button
                  onClick={sendByEmail}
                  variant="outlined"
                  disabled={!customerEmail}
                  title={!customerEmail ? 'Email client manquant' : 'Ouvrir un brouillon email'}
                >
                  Envoyer par email
                </Button>
                <Button onClick={() => window.open(link, '_blank')} variant="outlined">
                  Tester
                </Button>
              </Stack>

              <Alert severity="info">
                Quand ton client a payé, clique <strong>« Vérifier le paiement »</strong> pour marquer la facture
                comme payée. Une vérification auto au démarrage de l&apos;app fera le job automatiquement à terme.
              </Alert>

              <Button
                onClick={checkPayment}
                variant="contained"
                disabled={checking || status === 'paid'}
                startIcon={checking ? <CircularProgress size={18} /> : null}
              >
                {status === 'paid' ? 'Facture payée' : 'Vérifier le paiement'}
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
