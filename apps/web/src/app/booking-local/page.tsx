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
  const [rangeEnd, setRangeEnd] = useState<string>(() => isoLocal(addDays(new Date(), 7)));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<{ start: string; end: string; available: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ start: string; end: string; available: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", bike: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

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

  useEffect(() => { load(); loadCustomers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  function selectCustomer(customer: any) {
    if (!customer) return;
    setForm({
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || '',
      email: customer.email || '',
      phone: customer.phone || '',
      bike: '',
      description: ''
    });
  }

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

  function renderSlotsByDay() {
    // Grouper les créneaux par jour (exclure les dimanches)
    const slotsByDay: { [key: string]: typeof slots } = {};
    
    slots.forEach(slot => {
      const date = new Date(slot.start);
      const dayOfWeek = date.getDay();
      // Exclure les dimanches (0)
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

      <Paper variant="outlined" sx={{ p:2, overflowX: 'auto' }}>
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /> <Typography>Chargement…</Typography></Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renderSlotsByDay()}
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réserver le créneau</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                const name = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                return name || option.email || 'Client sans nom';
              }}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2">
                        {`${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email}
                      </Typography>
                      {option.phone && (
                        <Typography variant="caption" color="text.secondary">
                          {option.phone}
                        </Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
              freeSolo
              loading={loadingCustomers}
              onChange={(e, value) => {
                if (value && typeof value !== 'string') {
                  selectCustomer(value);
                }
              }}
              inputValue={form.name}
              onInputChange={(e, value) => setForm({ ...form, name: value })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nom (ou sélectionnez un client existant)"
                  required
                  fullWidth
                />
              )}
            />
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
