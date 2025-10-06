"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
} from "@mui/material";

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
  const [rangeStart, setRangeStart] = useState<string>(() => isoLocal(new Date()));
  const [rangeEnd, setRangeEnd] = useState<string>(() => isoLocal(addDays(new Date(), 14)));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ start: string; end: string } | null>(null);
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
      await load();
    } catch (e:any) {
      setSubmitMsg({ ok: false, msg: e?.message || "Erreur" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: { xs:2, md:3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Prendre rendez-vous</Typography>

      {submitMsg && (
        <Alert sx={{ mb:2 }} severity={submitMsg.ok ? 'success' : 'error'}>{submitMsg.msg}</Alert>
      )}

      <Paper variant="outlined" sx={{ p:2, mb:3 }}>
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
            <Button variant="contained" onClick={load} disabled={loading}>Rechercher</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p:2 }}>
        <Typography variant="subtitle1" sx={{ mb:1 }}>Créneaux disponibles</Typography>
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /> <Typography>Chargement…</Typography></Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <Grid container spacing={1}>
            {slots.map((s) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={s.start}>
                <Button variant="outlined" fullWidth onClick={() => { setSelected(s); setOpen(true); }}>
                  <span suppressHydrationWarning>{new Date(s.start).toLocaleString()}</span>
                </Button>
              </Grid>
            ))}
            {!slots.length && (
              <Grid item xs={12}><Typography color="text.secondary">Aucun créneau dans l’intervalle choisi.</Typography></Grid>
            )}
          </Grid>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réserver le créneau</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nom" fullWidth required value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} />
            <TextField label="Téléphone" fullWidth value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} />
            <TextField label="Vélo" fullWidth value={form.bike} onChange={e=>setForm({ ...form, bike: e.target.value })} />
            <TextField label="Description du besoin" multiline minRows={3} fullWidth value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} />
            {selected && (
              <Alert severity="info">Créneau sélectionné: <b><span suppressHydrationWarning>{new Date(selected.start).toLocaleString()}</span></b></Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={submitBooking} disabled={!form.name || submitting}>
            {submitting ? 'Envoi…' : 'Confirmer la réservation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
