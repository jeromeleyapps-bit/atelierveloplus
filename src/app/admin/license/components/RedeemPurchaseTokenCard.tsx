"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { logger } from '@/lib/logger';

interface Props {
  /** Appelé après activation réussie pour rafraîchir l'état licence de la page parente. */
  onActivated?: () => void;
}

/**
 * Activation d'un code d'achat reçu par email après paiement Stripe.
 *
 * UX en une étape pour le client : il colle son code, clique « Activer », c'est fini.
 * En coulisses : récupère le hardware ID → /license/redeem (Worker, signe la clé RSA)
 * → /api/admin/license/activate (enregistre la licence en base). La clé brute n'est
 * jamais montrée au client.
 */
export default function RedeemPurchaseTokenCard({ onActivated }: Props) {
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [hardwareId, setHardwareId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState<{ tier?: string } | null>(null);

  useEffect(() => {
    const fromUrl = params.get('token');
    if (fromUrl) setCode(fromUrl.toUpperCase());

    fetch('/api/admin/license/hardware-id', {
      headers: (() => {
        const t = window.localStorage.getItem('jwt_token');
        return t ? { Authorization: `Bearer ${t}` } : {};
      })(),
    })
      .then(r => r.json())
      .then(d => setHardwareId(d.hardwareId || null))
      .catch(e => logger.error('[redeem] hardware-id fetch failed', e));
  }, [params]);

  async function submit() {
    setError(null);
    setActivated(null);
    if (!code.trim()) {
      setError('Colle ton code d\'activation.');
      return;
    }
    if (!hardwareId) {
      setError('Identifiant machine indisponible. Patiente une seconde et réessaie.');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_ATELIER_API_BASE;
      if (!apiBase) {
        throw new Error('Activation indisponible (service non configuré). Contacte le support.');
      }

      // 1) Échange le code contre une clé de licence signée (Worker Cloudflare).
      const redeemRes = await fetch(`${apiBase.replace(/\/$/, '')}/license/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim(), hardwareId }),
      });
      const redeemData = await redeemRes.json();
      if (!redeemRes.ok) {
        const known: Record<string, string> = {
          token_not_found: 'Code inconnu — vérifie la saisie.',
          token_expired: 'Ce code a expiré.',
          token_already_used_other_machine: 'Ce code a déjà été utilisé sur un autre ordinateur.',
          invalid_hardware_id: 'Identifiant machine invalide.',
        };
        throw new Error(known[redeemData.error] || redeemData.detail || 'Code invalide.');
      }

      // 2) Active la licence localement (enregistrement en base) — invisible pour le client.
      const jwt = window.localStorage.getItem('jwt_token');
      const activateRes = await fetch('/api/admin/license/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ key: redeemData.licenseKey }),
      });
      const activateData = await activateRes.json();
      if (!activateRes.ok || activateData.success === false) {
        throw new Error(activateData.message || 'Échec de l\'activation de la licence.');
      }

      setActivated({ tier: redeemData.tier });
      setCode('');
      onActivated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
      logger.error('[redeem] activation failed', e);
    } finally {
      setSubmitting(false);
    }
  }

  const tierLabel = ({ basique: 'Basique', pro: 'Pro', pro_lifetime: 'Pro Lifetime' } as Record<string, string>)[
    activated?.tier || ''
  ] || 'votre licence';

  if (activated) {
    return (
      <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            <Stack>
              <Typography variant="h6">Licence {tierLabel} activée 🎉</Typography>
              <Typography variant="body2" color="text.secondary">
                Tout est prêt. Tu peux profiter de l&apos;application.
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Activer un code d&apos;achat</Typography>
          <Typography variant="body2" color="text.secondary">
            Colle le code reçu par email après ton achat, puis clique sur Activer.
          </Typography>

          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          <TextField
            label="Code d'activation"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            fullWidth
            placeholder="Ex. 7F2A8B…"
            inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2 } }}
            disabled={submitting}
          />

          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" onClick={submit} disabled={submitting || !hardwareId}>
              {submitting ? <CircularProgress size={22} /> : 'Activer'}
            </Button>
            {!hardwareId && (
              <Typography variant="caption" color="text.secondary">
                Préparation…
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
