"use client";

// ✅ Hooks personnalisés
import { useCalendarData, type CalendarEvent, type CalendarBlock, type CalendarBooking } from '@/hooks/useCalendarData';
import { useCalendarUI } from '@/hooks/useCalendarUI';
import { useEffect, useRef } from "react"
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Container from '@mui/material/Container';
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import RefreshIcon from "@mui/icons-material/Refresh";
// ✅ OPTIMISATION: Lazy loading FullCalendar pour réduire bundle initial
import dynamic from 'next/dynamic';
import { forwardRef } from 'react';

// Wrapper avec forwardRef pour supporter ref (nécessaire pour calRef.current?.getApi())
const FullCalendarBase = dynamic(
  () => import('@fullcalendar/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Chargement du calendrier...</div>
  }
);

// FullCalendar avec support ref via forwardRef
// Note: Type assertion nécessaire car FullCalendar avec dynamic() a des limitations de types
const FullCalendar = forwardRef<any, any>((props: any, ref: any) => {
  return <FullCalendarBase {...props} ref={ref as any} />;
}) as any;
FullCalendar.displayName = 'FullCalendar';

// Plugins FullCalendar (légers, import direct OK)
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { createCalendarEvent, createCalendarBlock, updateBookingStatus } from "@/lib/api";
import { logger } from '@/lib/logger';

interface FullCalendarRef {
  getApi: () => {
    view: {
      activeStart: Date;
      activeEnd: Date;
    };
  };
}

interface EventClickArg {
  event: {
    id: string;
  };
}

export default function AdminCalendarPage() {
  // ✅ Hooks personnalisés
  const calendarData = useCalendarData();
  const calendarUI = useCalendarUI();

  // Thème cyan pour calendrier
  const theme = {
    bg: '#E0F7FA',
    border: '#26C6DA',
    text: '#00838F',
    primary: '#26C6DA',
    primaryDark: '#00ACC1',
    primaryLight: '#E0F7FA',
  };

  // Alias locaux - Data
  const events = calendarData.events;
  const blocks = calendarData.blocks;
  const bookings = calendarData.bookings;
  const loading = calendarData.loading;
  const err = calendarData.err;
  const loadRange = calendarData.loadRange;
  const refresh = calendarData.refresh;
  // Note: setErr is internal to calendarData hook (not exposed)
  const editOpen = calendarUI.editOpen;
  const setEditOpen = calendarUI.setEditOpen;
  const editingBooking = calendarUI.editingBooking;
  const _setEditingBooking = calendarUI.setEditingBooking;
  const editStatus = calendarUI.editStatus;
  const setEditStatus = calendarUI.setEditStatus;
  const evTitle = calendarUI.evTitle;
  const setEvTitle = calendarUI.setEvTitle;
  const evStart = calendarUI.evStart;
  const setEvStart = calendarUI.setEvStart;
  const evEnd = calendarUI.evEnd;
  const setEvEnd = calendarUI.setEvEnd;
  const blReason = calendarUI.blReason;
  const setBlReason = calendarUI.setBlReason;
  const blStart = calendarUI.blStart;
  const setBlStart = calendarUI.setBlStart;
  const blEnd = calendarUI.blEnd;
  const setBlEnd = calendarUI.setBlEnd;

  // ✅ OPTIMISATION: FullCalendar avec lazy loading (pas de type ref strict nécessaire)
  const calRef = useRef<FullCalendarRef | null>(null);

  // Note: refresh() est appelé via le bouton Actualiser, pas besoin de useEffect

  interface FCEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    color: string;
  }

  function fcEvents(): FCEvent[] {
    const items: FCEvent[] = [];
    for (const e of events) items.push({ id: `E:${e.id}`, title: e.title || "Événement", start: e.start, end: e.end, color: e.blocksAvail ? "#e53935" : "#1976d2" });
    for (const b of blocks) items.push({ id: `B:${b.id}`, title: b.reason || "Indisponible", start: b.start, end: b.end, color: "#8d6e63" });
    for (const k of bookings) {
      const status = k.status || 'pending';
      const color = status === 'confirmed' ? '#2e7d32' : status === 'cancelled' ? '#757575' : status === 'done' ? '#1565c0' : '#43a047';
      items.push({ id: `K:${k.id}`, title: `RDV: ${k.name}`, start: k.start, end: k.end, color });
    }
    return items;
  }

  function onEventClick(arg: EventClickArg) {
    const id: string = arg.event.id || '';
    if (id.startsWith('K:')) {
      const bid = id.slice(2);
      const k = bookings.find(x => x.id === bid);
      if (k) {
        calendarUI.openEditBooking(k);
      }
    }
  }

  async function saveEditBooking() {
    if (!editingBooking) return;
    try {
      await updateBookingStatus(editingBooking.id, editStatus);
      calendarUI.closeEditBooking();
      await refresh();
    } catch (e) {
      logger.error('Save booking error:', e);
    }  
  }

  async function createEvent() {
    try {
      await createCalendarEvent({
        title: evTitle || "Travail atelier",
        start: new Date(evStart).toISOString(),
        end: new Date(evEnd).toISOString(),
        blocksAvail: true
      });
      setEvTitle(""); 
      await refresh();
    } catch (e) { 
      logger.error('Create event error:', e);
    }
  }

  async function createBlock() {
    try {
      await createCalendarBlock({
        reason: blReason || "Indispo",
        start: new Date(blStart).toISOString(),
        end: new Date(blEnd).toISOString()
      });
      setBlReason(""); 
      await refresh();
    } catch (e) { 
      logger.error('Create block error:', e);
    }
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
          ref={calRef}
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
              {events.map((e: CalendarEvent) => (
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
              {blocks.map((b: CalendarBlock) => (
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
              {bookings.map((b: CalendarBooking) => (
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

      {/* Dialog Modifier Réservation */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réservation - {editingBooking?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingBooking && (
              <>
                <Typography><strong>Client:</strong> {editingBooking.name}</Typography>
                {editingBooking.phone && <Typography><strong>Téléphone:</strong> {editingBooking.phone}</Typography>}
                {editingBooking.email && <Typography><strong>Email:</strong> {editingBooking.email}</Typography>}
                <Typography><strong>Début:</strong> {new Date(editingBooking.start).toLocaleString('fr-FR')}</Typography>
                <Typography><strong>Fin:</strong> {new Date(editingBooking.end).toLocaleString('fr-FR')}</Typography>
                {editingBooking.bike && <Typography><strong>Vélo:</strong> {editingBooking.bike}</Typography>}
                {editingBooking.description && <Typography><strong>Description:</strong> {editingBooking.description}</Typography>}
                
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select value={editStatus} label="Statut" onChange={(e) => setEditStatus(e.target.value)}>
                    <MenuItem value="pending">En attente</MenuItem>
                    <MenuItem value="confirmed">Confirmé</MenuItem>
                    <MenuItem value="cancelled">Annulé</MenuItem>
                    <MenuItem value="done">Terminé</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Fermer</Button>
          <Button variant="contained" color="error" onClick={async () => {
            if (!editingBooking) return;
            if (!confirm('Annuler ce rendez-vous ? Le créneau sera libéré.')) return;
            try {
              await updateBookingStatus(editingBooking.id, 'cancelled');
              setEditOpen(false);
              const api = calRef.current?.getApi();
              if (api) await loadRange(api.view.activeStart, api.view.activeEnd);
            } catch (e) {
              logger.error('Cancel booking error:', e);
            }
          }}>
            Annuler le RDV
          </Button>
          <Button variant="contained" onClick={saveEditBooking}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
