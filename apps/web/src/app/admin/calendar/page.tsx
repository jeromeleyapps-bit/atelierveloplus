"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Divider, Grid, Paper, Stack, TextField, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, Container } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { listCalendarEvents, listCalendarBlocks, listCalendarBookings, createCalendarEvent, createCalendarBlock, updateBookingStatus } from "@/lib/api";

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
  // Thème cyan pour calendrier
  const theme = {
    bg: '#E0F7FA',
    border: '#26C6DA',
    text: '#00838F',
    primary: '#26C6DA',
    primaryDark: '#00ACC1',
    primaryLight: '#E0F7FA',
  };
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
      const [ev, bl, bk] = await Promise.all([
        listCalendarEvents({ start: now.toISOString(), end: soon.toISOString() }),
        listCalendarBlocks({ start: now.toISOString(), end: soon.toISOString() }),
        listCalendarBookings({ start: now.toISOString(), end: soon.toISOString() }),
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
      const [ev, bl, bk] = await Promise.all([
        listCalendarEvents({ start: start.toISOString(), end: end.toISOString() }),
        listCalendarBlocks({ start: start.toISOString(), end: end.toISOString() }),
        listCalendarBookings({ start: start.toISOString(), end: end.toISOString() }),
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
      await updateBookingStatus(editingBooking.id, editStatus);
      setEditOpen(false);
      const api = calRef.current?.getApi();
      if (api) await loadRange(api.view.activeStart, api.view.activeEnd);
    } catch (e:any) { setErr(e?.message || 'Échec mise à jour statut'); }
  }

  async function createEvent() {
    setErr(null);
    try {
      await createCalendarEvent({
        title: evTitle || "Travail atelier",
        start: new Date(evStart).toISOString(),
        end: new Date(evEnd).toISOString(),
        blocksAvail: true
      });
      setEvTitle(""); refresh();
    } catch(e:any) { setErr(e?.message || "Erreur création événement"); }
  }

  async function createBlock() {
    setErr(null);
    try {
      await createCalendarBlock({
        reason: blReason || "Indispo",
        start: new Date(blStart).toISOString(),
        end: new Date(blEnd).toISOString()
      });
      setBlReason(""); refresh();
    } catch(e:any) { setErr(e?.message || "Erreur création indisponibilité"); }
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header Moderne Cyan */}
      <Box
        sx={{
          bgcolor: theme.bg,
          borderBottom: 2,
          borderColor: theme.border,
          py: 3,
          mb: 3,
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CalendarMonthIcon sx={{ fontSize: 40, color: theme.text }} />
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                  📅 Calendrier
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestion des rendez-vous et disponibilités
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refresh}
              disabled={loading}
              sx={{
                borderColor: theme.border,
                color: theme.text,
                '&:hover': {
                  borderColor: theme.primaryDark,
                  bgcolor: theme.primaryLight,
                },
              }}
            >
              Actualiser
            </Button>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="xl">
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
      </Container>
    </Box>
  );
}
