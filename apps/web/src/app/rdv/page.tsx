"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Container,
} from "@mui/material";
import Image from "next/image";

function isoLocal(d: Date) {
  const z = (n: number) => `${n}`.padStart(2, "0");
  const y = d.getFullYear();
  const m = z(d.getMonth() + 1);
  const day = z(d.getDate());
  const hh = z(d.getHours());
  const mm = z(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function addDays(d: Date, days: number) { return new Date(d.getTime() + days*24*3600*1000); }

export default function PublicBookingPage() {
  // Thème cyan pour calendrier/RDV
  const theme = {
    bg: '#E0F7FA',
    border: '#26C6DA',
    text: '#00838F',
    primary: '#26C6DA',
    primaryDark: '#00ACC1',
  };

  const [rangeStart, setRangeStart] = useState<string>(() => isoLocal(new Date()));
  const [rangeEnd, setRangeEnd] = useState<string>(() => isoLocal(addDays(new Date(), 7)));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<{ start: string; end: string; available: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ start: string; end: string; available: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", bike: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const rs = new Date(rangeStart).toISOString();
      const re = new Date(rangeEnd).toISOString();
      const r = await fetch(`/api/calendar/availability?start=${encodeURIComponent(rs)}&end=${encodeURIComponent(re)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Erreur de chargement");
      setSlots(j.slots || []);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // SUPPRIMÉ : Ne pas charger les clients sur la page publique (fuite de données)
  // Les clients ne doivent être accessibles que dans l'interface admin

  async function submitBooking() {
    if (!selected) return;
    setSubmitting(true); setSubmitMsg(null);
    try {
      const payload = {
        start: selected.start,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        bike: form.bike || undefined,
        description: form.description || undefined,
      };
      const res = await fetch(`/api/calendar/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Réservation impossible");
      setSubmitMsg({ ok: true, msg: "Réservation enregistrée. Vous recevrez une confirmation." });
      setOpen(false);
      setForm({ name: "", email: "", phone: "", bike: "", description: "" });
      setSelected(null);
      await load();
    } catch (e: any) {
      setSubmitMsg({ ok: false, msg: e?.message || "Erreur lors de la réservation" });
    } finally {
      setSubmitting(false);
    }
  }

  function renderSlotsByDay() {
    const slotsByDay: { [key: string]: typeof slots } = {};
    
    slots.forEach(slot => {
      const date = new Date(slot.start);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) return;
      
      const dayKey = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!slotsByDay[dayKey]) slotsByDay[dayKey] = [];
      slotsByDay[dayKey].push(slot);
    });

    const days = Object.keys(slotsByDay);
    
    if (days.length === 0) {
      return <Typography color="text.secondary">Aucun créneau disponible dans la période sélectionnée.</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {days.map(day => {
          const daySlots = slotsByDay[day];
          const firstSlot = new Date(daySlots[0].start);
          const dayOfWeek = firstSlot.getDay();
          const isSaturday = dayOfWeek === 6;
          
          return (
            <Paper 
              key={day} 
              sx={{ 
                minWidth: 200, 
                p: 2, 
                bgcolor: isSaturday ? 'action.hover' : 'background.paper',
                border: isSaturday ? '2px dashed' : '1px solid',
                borderColor: isSaturday ? 'warning.main' : 'divider'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>
                {day}
              </Typography>
              {isSaturday && (
                <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                  Horaires spéciaux : 10h-17h
                </Alert>
              )}
              <Stack spacing={1}>
                {daySlots.map(slot => (
                  <Button
                    key={slot.start}
                    variant={slot.available ? (isSaturday ? "outlined" : "contained") : "outlined"}
                    size="small"
                    fullWidth
                    onClick={() => { if (slot.available) { setSelected(slot); setOpen(true); } }}
                    disabled={!slot.available}
                    sx={{ 
                      justifyContent: 'center',
                      textTransform: 'none',
                      bgcolor: !slot.available ? 'action.disabledBackground' : undefined,
                      color: !slot.available ? 'text.disabled' : undefined,
                      borderColor: !slot.available ? 'divider' : undefined,
                      '&:hover': {
                        bgcolor: !slot.available ? 'action.disabledBackground' : undefined,
                        cursor: !slot.available ? 'not-allowed' : 'pointer'
                      }
                    }}
                  >
                    {new Date(slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {!slot.available && ' (Complet)'}
                  </Button>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header Moderne Cyan */}
      <Box sx={{ 
        bgcolor: theme.bg,
        borderBottom: 2,
        borderColor: theme.border,
        py: 3,
        boxShadow: 2
      }}>
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ position: 'relative', width: 60, height: 60 }}>
              <Image 
                src="/logo.png" 
                alt="Atelier Vélo+" 
                fill
                style={{ objectFit: 'contain' }}
              />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                📅 Prise de Rendez-vous
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Atelier Vélo+ - Upgraded Bikes
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Réservez votre créneau atelier
          </Typography>
        </Container>
      </Box>

      {/* Contenu */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {submitMsg && (
          <Alert sx={{ mb: 3 }} severity={submitMsg.ok ? 'success' : 'error'} onClose={() => setSubmitMsg(null)}>
            {submitMsg.msg}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Rechercher un créneau</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Début de recherche"
                type="datetime-local"
                fullWidth
                size="small"
                value={rangeStart}
                onChange={e=>setRangeStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Fin de recherche"
                type="datetime-local"
                fullWidth
                size="small"
                value={rangeEnd}
                onChange={e=>setRangeEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button variant="contained" onClick={load} disabled={loading} fullWidth>
                Rechercher
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, overflowX: 'auto' }}>
          {loading && (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CircularProgress size={20} /> 
              <Typography>Chargement…</Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {renderSlotsByDay()}
            </Box>
          )}
        </Paper>
      </Container>

      {/* Dialog de réservation */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réserver le créneau</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField 
              label="Nom" 
              required 
              fullWidth 
              value={form.name} 
              onChange={e=>setForm({ ...form, name: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField 
              label="Email" 
              type="email" 
              fullWidth 
              value={form.email} 
              onChange={e=>setForm({ ...form, email: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Email ou téléphone requis"
            />
            <TextField 
              label="Téléphone" 
              fullWidth 
              value={form.phone} 
              onChange={e=>setForm({ ...form, phone: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Email ou téléphone requis"
            />
            <TextField 
              label="Vélo" 
              fullWidth 
              value={form.bike} 
              onChange={e=>setForm({ ...form, bike: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField 
              label="Description du besoin" 
              multiline 
              minRows={3} 
              fullWidth 
              value={form.description} 
              onChange={e=>setForm({ ...form, description: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            {selected && (
              <Alert severity="info">Créneau sélectionné: <b><span suppressHydrationWarning>{new Date(selected.start).toLocaleString()}</span></b></Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={submitBooking} 
            disabled={!form.name || (!form.email && !form.phone) || submitting}
          >
            {submitting ? 'Envoi…' : 'Confirmer la réservation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.100', py: 3, mt: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Atelier Vélo+ - Upgraded Bikes - Tous droits réservés
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
