"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Divider, Grid, Paper, Stack, TextField, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

function isoLocal(d: Date) {
  const z = n => `${n}`.padStart(2, "0");
  const y = d.getFullYear();
  const m = z(d.getMonth() + 1);
  const day = z(d.getDate());
  const hh = z(d.getHours());
  const mm = z(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>("pending");

  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState(isoLocal(new Date()));
  const [evEnd, setEvEnd] = useState(isoLocal(new Date(Date.now() + 60*60000)));

  const [blReason, setBlReason] = useState("");
  const [blStart, setBlStart] = useState(isoLocal(new Date()));
  const [blEnd, setBlEnd] = useState(isoLocal(new Date(Date.now() + 60*60000)));

  const calRef = useRef<FullCalendar | null>(null);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 14*24*3600*1000);
      const qs = `?start=${now.toISOString()}&end=${soon.toISOString()}`;
      const [ev, bl, bk] = await Promise.all([
        fetch(`/api/calendar/events${qs}`).then(r=>r.json()),
        fetch(`/api/calendar/blocks${qs}`).then(r=>r.json()),
        fetch(`/api/calendar/bookings${qs}`).then(r=>r.json()),
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      setBlocks(Array.isArray(bl) ? bl : []);
      setBookings(Array.isArray(bk) ? bk : []);
    } catch(e:any) { setErr(e?.message || "Erreur de chargement"); }
    finally { setLoading(false); }
  }

  async function loadRange(start: Date, end: Date) {
    setLoading(true); setErr(null);
    try {
      const qs = `?start=${start.toISOString()}&end=${end.toISOString()}`;
      const [ev, bl, bk] = await Promise.all([
        fetch(`/api/calendar/events${qs}`).then(r=>r.json()),
        fetch(`/api/calendar/blocks${qs}`).then(r=>r.json()),
        fetch(`/api/calendar/bookings${qs}`).then(r=>r.json()),
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      setBlocks(Array.isArray(bl) ? bl : []);
      setBookings(Array.isArray(bk) ? bk : []);
    } catch(e:any) { setErr(e?.message || "Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  function fcEvents() {
    const items: any[] = [];
    for (const e of events) items.push({ id: `E:${e.id}`, title: e.title || "Événement", start: e.start, end: e.end, color: e.blocksAvail ? "#e53935" : "#1976d2" });
    for (const b of blocks) items.push({ id: `B:${b.id}`, title: b.reason || "Indisponible", start: b.start, end: b.end, color: "#8d6e63" });
    for (const k of bookings) {
      const status = (k.status || 'pending') as string;
      const color = status === 'confirmed' ? '#2e7d32' : status === 'cancelled' ? '#757575' : status === 'done' ? '#1565c0' : '#43a047';
      items.push({ id: `K:${k.id}`, title: `RDV: ${k.name}`, start: k.start, end: k.end, color });
    }
    return items;
  }

  function onEventClick(arg: any) {
    const id: string = arg.event.id || '';
    if (id.startsWith('K:')) {
      const bid = id.slice(2);
      const b = bookings.find((x:any) => x.id === bid);
      if (b) {
        setEditingBooking(b);
        setEditStatus(b.status || 'pending');
        setEditOpen(true);
      }
    }
  }

  async function saveBookingStatus() {
    if (!editingBooking) return;
    try {
      const res = await fetch(`/api/calendar/bookings/${editingBooking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: editStatus }) });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        setErr(j?.error || 'Échec mise à jour statut');
        return;
      }
      setEditOpen(false);
      const api = calRef.current?.getApi();
      if (api) await loadRange(api.view.activeStart, api.view.activeEnd);
    } catch (e:any) { setErr(e?.message || 'Échec mise à jour statut'); }
  }

  async function createEvent() {
    setErr(null);
    const res = await fetch(`/api/calendar/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: evTitle || "Travail atelier", start: new Date(evStart).toISOString(), end: new Date(evEnd).toISOString(), blocksAvail: true })
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>({})); setErr(j?.error || "Erreur création événement"); return;
    }
    setEvTitle(""); refresh();
  }

  async function createBlock() {
    setErr(null);
    const res = await fetch(`/api/calendar/blocks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: blReason || "Indispo", start: new Date(blStart).toISOString(), end: new Date(blEnd).toISOString() })
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>({})); setErr(j?.error || "Erreur création indisponibilité"); return;
    }
    setBlReason(""); refresh();
  }

  return (
    <Box sx={{ p: { xs:2, md:3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Calendrier (Admin)</Typography>
      {err && <Alert severity="error" sx={{ mb:2 }}>{String(err)}</Alert>}

      <Paper variant="outlined" sx={{ p:1, mb:3 }}>
        <FullCalendar
          ref={calRef as any}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height={"55vh"}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          locale="fr"
          firstDay={1}
          events={fcEvents()}
          eventClick={onEventClick}
          datesSet={(arg) => { loadRange(arg.start, arg.end); }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p:2, mb:3 }}>
        <Typography variant="subtitle1" sx={{ mb:1 }}>Créer un événement (bloquant)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Titre" fullWidth size="small" value={evTitle} onChange={e=>setEvTitle(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Début" type="datetime-local" fullWidth size="small" value={evStart} onChange={e=>setEvStart(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Fin" type="datetime-local" fullWidth size="small" value={evEnd} onChange={e=>setEvEnd(e.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={createEvent}>Ajouter l’événement</Button></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p:2, mb:3 }}>
        <Typography variant="subtitle1" sx={{ mb:1 }}>Bloquer une période</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Raison" fullWidth size="small" value={blReason} onChange={e=>setBlReason(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Début" type="datetime-local" fullWidth size="small" value={blStart} onChange={e=>setBlStart(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Fin" type="datetime-local" fullWidth size="small" value={blEnd} onChange={e=>setBlEnd(e.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={createBlock}>Ajouter l’indisponibilité</Button></Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p:2 }}>
            <Typography variant="subtitle2">Événements</Typography>
            <Divider sx={{ my:1 }} />
            <Stack spacing={1} sx={{ maxHeight: 360, overflow: 'auto' }}>
              {events.map((e:any) => (
                <Box key={e.id} sx={{ p:1, bgcolor:'background.default', borderRadius:1, border:'1px solid', borderColor:'divider' }}>
                  <Typography fontWeight={600}>{e.title}</Typography>
                  <Typography variant="caption">{new Date(e.start).toLocaleString()} → {new Date(e.end).toLocaleString()}</Typography>
                </Box>
              ))}
              {!events.length && <Typography color="text.secondary">Aucun</Typography>}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p:2 }}>
            <Typography variant="subtitle2">Indisponibilités</Typography>
            <Divider sx={{ my:1 }} />
            <Stack spacing={1} sx={{ maxHeight: 360, overflow: 'auto' }}>
              {blocks.map((b:any) => (
                <Box key={b.id} sx={{ p:1, bgcolor:'background.default', borderRadius:1, border:'1px solid', borderColor:'divider' }}>
                  <Typography>{b.reason || "Indispo"}</Typography>
                  <Typography variant="caption">{new Date(b.start).toLocaleString()} → {new Date(b.end).toLocaleString()}</Typography>
                </Box>
              ))}
              {!blocks.length && <Typography color="text.secondary">Aucune</Typography>}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p:2 }}>
            <Typography variant="subtitle2">Réservations</Typography>
            <Divider sx={{ my:1 }} />
            <Stack spacing={1} sx={{ maxHeight: 360, overflow: 'auto' }}>
              {bookings.map((b:any) => (
                <Box key={b.id} sx={{ p:1, bgcolor:'background.default', borderRadius:1, border:'1px solid', borderColor:'divider' }}>
                  <Typography fontWeight={600}>{b.name} {b.phone ? `• ${b.phone}` : ""}</Typography>
                  <Typography variant="caption">{new Date(b.start).toLocaleString()} → {new Date(b.end).toLocaleString()}</Typography>
                  {b.bike && <Typography variant="caption">Vélo: {b.bike}</Typography>}
                  {b.description && <Typography variant="caption">Besoin: {b.description}</Typography>}
                </Box>
              ))}
              {!bookings.length && <Typography color="text.secondary">Aucune</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
