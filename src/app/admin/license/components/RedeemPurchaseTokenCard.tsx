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
import { logger } from '@/lib/logger';

interface Props {
  onSuccess?: (key: string) => void;
}

/**
 * Bloc d'activation d'un code d'achat reçu par email après paiement Stripe.
 * Récupère le hardware ID local, appelle /api/license/redeem, persiste la clé.
 */
export default function RedeemPurchaseTokenCard({ onSuccess }: Props) {
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [hardwareId, setHardwareId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

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
    setInfo(null);
    setLicenseKey(null);
    if (!code.trim()) {
      setError('Colle ton code d\'activation.');
      return;
    }
    if (!hardwareId) {
      setError('Identifiant machine indisponible. Réessaie dans un instant.');
      return;
    }
    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_ATELIER_API_BASE;
      if (!apiBase) {
        throw new Error('Activation indisponible — NEXT_PUBLIC_ATELIER_API_BASE non configuré.');
      }
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/license/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim(), hardwareId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const known: Record<string, string> = {
          token_not_found: 'Code inconnu — vérifie la saisie.',
          token_expired: 'Ce code a expiré.',
          token_already_used_other_machine: 'Ce code a déjà été utilisé sur une autre machine.',
          invalid_hardware_id: 'Identifiant machine invalide.',
        };
        throw new Error(known[data.error] || data.detail || 'Activation impossible');
      }
      setLicenseKey(data.licenseKey);
      setInfo('Clé générée. Active-la avec le bouton ci-dessous.');
      onSuccess?.(data.licenseKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Activer un code d&apos;achat</Typography>
          <Typography variant="body2" color="text.secondary">
            Colle le code reçu par email après ton paiement Stripe.
            Ton identifiant machine est utilisé pour lier la licence à ce poste.
          </Typography>

          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

          <TextField
            label="Code d'activation"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            fullWidth
            placeholder="Ex. 7F2A8B…"
            inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2 } }}
          />

          <Typography variant="caption" color="text.secondary">
            Identifiant machine&nbsp;: <code>{hardwareId || '…'}</code>
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={submit} disabled={submitting || !hardwareId}>
              {submitting ? <CircularProgress size={22} /> : 'Activer'}
            </Button>
          </Stack>

          {licenseKey && (
            <Alert severity="info">
              <strong>Ta clé&nbsp;:</strong>
              <Typography component="div" sx={{ fontFamily: 'monospace', fontSize: 12, mt: 1, wordBreak: 'break-all' }}>
                {licenseKey}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1} component="div">
                Copie-la dans le champ &laquo;&nbsp;Activer une licence&nbsp;&raquo; ci-dessous.
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
