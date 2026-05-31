"use client";

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RequireAuth from '@/app/components/RequireAuth';
import { logger } from '@/lib/logger';

interface PkgLine {
  type: string;
  description: string;
  quantity: number;
  priceHT: number;
  vatRate: number;
  duration?: number | null;
}
interface Pkg {
  id: string;
  name: string;
  description?: string | null;
  lines: PkgLine[];
}

function emptyLine(): PkgLine {
  return { type: 'part', description: '', quantity: 1, priceHT: 0, vatRate: 20, duration: null };
}

function ForfaitsContent() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<PkgLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/admin/service-packages');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (e) {
      logger.error('[forfaits] load failed', e);
    }
  }
  useEffect(() => { load(); }, []);

  function updateLine(i: number, patch: Partial<PkgLine>) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save() {
    setError(null); setInfo(null);
    if (!name.trim()) { setError('Donne un nom au forfait.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/service-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, lines: lines.filter(l => l.description.trim()) }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Erreur'); }
      setInfo(`Forfait « ${name} » créé.`);
      setName(''); setDescription(''); setLines([emptyLine()]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce forfait ?')) return;
    await fetch(`/api/admin/service-packages/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>Forfaits</Typography>
        <Typography variant="body2" color="text.secondary">
          Crée des forfaits prédéfinis (main d&apos;œuvre + pièces) à ajouter en 1 clic sur un ticket.
        </Typography>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

        {/* Création */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Nouveau forfait</Typography>
              <TextField label="Nom (ex. Forfait Crevaison)" value={name} onChange={e => setName(e.target.value)} fullWidth />
              <TextField label="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} fullWidth />
              <Divider>Lignes</Divider>
              {lines.map((l, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                  <TextField select label="Type" value={l.type} onChange={e => updateLine(i, { type: e.target.value })} sx={{ minWidth: 110 }} size="small">
                    <MenuItem value="part">Pièce</MenuItem>
                    <MenuItem value="labor">Main d&apos;œuvre</MenuItem>
                  </TextField>
                  <TextField label="Description" value={l.description} onChange={e => updateLine(i, { description: e.target.value })} size="small" sx={{ flex: 1 }} />
                  <TextField label="Qté" type="number" value={l.quantity} onChange={e => updateLine(i, { quantity: Number(e.target.value) })} size="small" sx={{ width: 80 }} />
                  <TextField label="PU HT" type="number" value={l.priceHT} onChange={e => updateLine(i, { priceHT: Number(e.target.value) })} size="small" sx={{ width: 100 }} />
                  <TextField label="TVA %" type="number" value={l.vatRate} onChange={e => updateLine(i, { vatRate: Number(e.target.value) })} size="small" sx={{ width: 80 }} />
                  <IconButton onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} disabled={lines.length === 1}><DeleteIcon /></IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setLines(prev => [...prev, emptyLine()])} size="small">Ajouter une ligne</Button>
              <Button variant="contained" onClick={save} disabled={saving}>Créer le forfait</Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Liste */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Forfaits existants ({packages.length})</Typography>
            {packages.length === 0 ? (
              <Typography color="text.secondary">Aucun forfait pour l&apos;instant.</Typography>
            ) : (
              <Stack spacing={1}>
                {packages.map(p => (
                  <Stack key={p.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack>
                      <Typography fontWeight={600}>{p.name}</Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {p.lines.map((l, i) => (
                          <Chip key={i} size="small" label={`${l.description} ×${l.quantity}`} variant="outlined" />
                        ))}
                      </Stack>
                    </Stack>
                    <IconButton color="error" onClick={() => remove(p.id)}><DeleteIcon /></IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

export default function ForfaitsPage() {
  return (
    <RequireAuth>
      <ForfaitsContent />
    </RequireAuth>
  );
}
