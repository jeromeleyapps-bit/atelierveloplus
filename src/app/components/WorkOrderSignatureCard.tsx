"use client";

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import GestureIcon from '@mui/icons-material/Gesture';
import SignaturePad from './SignaturePad';
import { logger } from '@/lib/logger';

interface SignedInfo {
  signature?: string | null;
  signedAt?: string | null;
  signedName?: string | null;
  condition?: string | null;
  accessories?: string | null;
}

interface Props {
  workOrderId: string;
  client: SignedInfo;   // signature d'accord (devis)
  intake: SignedInfo;   // bon de dépôt
  onChange?: () => void;
}

export default function WorkOrderSignatureCard({ workOrderId, client, intake, onChange }: Props) {
  const [clientOpen, setClientOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [condition, setCondition] = useState(intake.condition || '');
  const [accessories, setAccessories] = useState(intake.accessories || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(type: 'client' | 'intake', dataUrl: string, name: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'intake'
            ? { type, dataUrl, name, condition, accessories }
            : { type, dataUrl, name },
        ),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.error || 'Échec enregistrement');
      }
      if (type === 'client') setClientOpen(false);
      else setIntakeOpen(false);
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      logger.error('[signature] save failed', e);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '');

  return (
    <Card>
      <CardHeader avatar={<GestureIcon color="primary" />} title="Signatures" subheader="Accord client & bon de dépôt" />
      <CardContent>
        <Stack spacing={3}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          {/* Accord client (devis) */}
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2">Accord du client (avant travaux)</Typography>
              {client.signature
                ? <Chip label="Signé" color="success" size="small" />
                : <Chip label="Non signé" size="small" />}
            </Stack>
            {client.signature ? (
              <Box>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={client.signature} alt="Signature client" style={{ maxHeight: 80, border: '1px solid #eee', borderRadius: 4, background: '#fff' }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  {client.signedName ? `${client.signedName} — ` : ''}{fmt(client.signedAt)}
                </Typography>
                <Button size="small" onClick={() => setClientOpen(true)} sx={{ mt: 0.5 }}>Refaire signer</Button>
              </Box>
            ) : (
              <Button variant="outlined" startIcon={<GestureIcon />} onClick={() => setClientOpen(true)}>
                Faire signer le client
              </Button>
            )}
          </Stack>

          {/* Bon de dépôt */}
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2">Bon de dépôt (état du vélo à l&apos;entrée)</Typography>
              {intake.signature
                ? <Chip label="Signé" color="success" size="small" />
                : <Chip label="Non signé" size="small" />}
            </Stack>
            {intake.signature ? (
              <Box>
                {(intake.condition || intake.accessories) && (
                  <Typography variant="body2" color="text.secondary">
                    {intake.condition && <>État&nbsp;: {intake.condition}<br /></>}
                    {intake.accessories && <>Accessoires&nbsp;: {intake.accessories}</>}
                  </Typography>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={intake.signature} alt="Signature bon de dépôt" style={{ maxHeight: 80, border: '1px solid #eee', borderRadius: 4, background: '#fff' }} />
                <Typography variant="caption" color="text.secondary" display="block">{fmt(intake.signedAt)}</Typography>
                <Button size="small" onClick={() => setIntakeOpen(true)} sx={{ mt: 0.5 }}>Refaire</Button>
              </Box>
            ) : (
              <Button variant="outlined" startIcon={<GestureIcon />} onClick={() => setIntakeOpen(true)}>
                Établir le bon de dépôt
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>

      {/* Dialog accord client */}
      <Dialog open={clientOpen} onClose={() => setClientOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Accord du client</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Le client signe pour valider le devis avant le début des travaux.
          </Typography>
          <SignaturePad
            label="Signature du client"
            confirming={saving}
            onConfirm={(dataUrl, name) => save('client', dataUrl, name)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog bon de dépôt */}
      <Dialog open={intakeOpen} onClose={() => setIntakeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bon de dépôt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="État constaté du vélo"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              multiline minRows={2} fullWidth
              placeholder="Ex. rayures cadre côté droit, pneu arrière usé…"
            />
            <TextField
              label="Accessoires laissés"
              value={accessories}
              onChange={(e) => setAccessories(e.target.value)}
              fullWidth
              placeholder="Ex. antivol, sacoche, éclairage…"
            />
            <SignaturePad
              label="Signature du client (prise en charge)"
              confirming={saving}
              onConfirm={(dataUrl, name) => save('intake', dataUrl, name)}
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
