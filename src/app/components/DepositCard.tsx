"use client";

import { useEffect, useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EuroIcon from '@mui/icons-material/Euro';
import { logger } from '@/lib/logger';

interface Deposit {
  id: string;
  amount: number;
  method?: string | null;
  note?: string | null;
  receiptNumber: string;
  createdAt: string;
}

const METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'transfer', label: 'Virement' },
  { value: 'other', label: 'Autre' },
];

export default function DepositCard({ workOrderId, onChange }: { workOrderId: string; onChange?: () => void }) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workorders/${workOrderId}/deposits`);
      const data = await res.json();
      setDeposits(data.deposits || []);
      setTotal(data.total || 0);
    } catch (e) {
      logger.error('[deposits] load failed', e);
    }
  }, [workOrderId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Montant invalide.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, method, note }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Erreur'); }
      setOpen(false); setAmount(''); setNote(''); setMethod('cash');
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <Card>
      <CardHeader avatar={<EuroIcon color="primary" />} title="Acomptes" subheader={total > 0 ? `Total versé : ${fmt(total)}` : 'Aucun acompte'} />
      <CardContent>
        <Stack spacing={2}>
          {deposits.length > 0 && (
            <Stack spacing={1}>
              {deposits.map(d => (
                <Stack key={d.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack>
                    <Typography fontWeight={600}>{fmt(d.amount)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.receiptNumber} — {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                      {d.method ? ` — ${METHODS.find(m => m.value === d.method)?.label || d.method}` : ''}
                    </Typography>
                  </Stack>
                  <IconButton
                    title="Télécharger le reçu"
                    onClick={() => window.open(`/api/workorders/${workOrderId}/deposits/${d.id}/receipt`, '_blank')}
                  >
                    <ReceiptLongIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
          <Button variant="outlined" startIcon={<EuroIcon />} onClick={() => setOpen(true)}>
            Enregistrer un acompte
          </Button>
        </Stack>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Enregistrer un acompte</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
            <TextField label="Montant (€)" type="number" value={amount} onChange={e => setAmount(e.target.value)} fullWidth autoFocus />
            <TextField select label="Mode de paiement" value={method} onChange={e => setMethod(e.target.value)} fullWidth>
              {METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField label="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} fullWidth placeholder="Ex. commande batterie Bosch" />
            <Button variant="contained" onClick={save} disabled={saving}>Valider et générer le reçu</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
