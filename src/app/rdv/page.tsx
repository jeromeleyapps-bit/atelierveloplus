"use client";

// ✅ Hooks personnalisés
import { useAppointmentsData } from '@/hooks/useAppointmentsData';
import { useAppointmentsUI } from '@/hooks/useAppointmentsUI';
import { useAppointmentsMutations } from '@/hooks/useAppointmentsMutations';
import { useAppointmentConfig } from '@/hooks/useAppointmentConfig';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ResponsiveContainer from "@/components/ResponsiveContainer";
import Image from "next/image";

export default function PublicBookingPage() {
  // ✅ Hooks personnalisés
  const appointmentsData = useAppointmentsData();
  const appointmentsUI = useAppointmentsUI();
  const appointmentsMutations = useAppointmentsMutations({
    onSuccess: (msg) => appointmentsUI.setSubmitMsg({ ok: true, msg }),
    onError: (msg) => appointmentsUI.setSubmitMsg({ ok: false, msg }),
  });
  const appointmentConfig = useAppointmentConfig();

  // Alias locaux pour utiliser les valeurs des hooks
  const rangeStart = appointmentsData.rangeStart;
  const setRangeStart = appointmentsData.setRangeStart;
  const rangeEnd = appointmentsData.rangeEnd;
  const setRangeEnd = appointmentsData.setRangeEnd;
  const loading = appointmentsData.isLoading;
  const slots = appointmentsData.slots;
  const error = appointmentsData.error;
  const load = appointmentsData.load;

  const open = appointmentsUI.open;
  const setOpen = appointmentsUI.setOpen;
  const selected = appointmentsUI.selected;
  const _setSelected = appointmentsUI.setSelected;
  const form = appointmentsUI.form;
  const setForm = appointmentsUI.setForm;
  const submitMsg = appointmentsUI.submitMsg;
  const setSubmitMsg = appointmentsUI.setSubmitMsg;

  const submitting = appointmentsMutations.isCreating;

  // Thème cyan pour calendrier/RDV
  const theme = {
    bg: '#E0F7FA',
    border: '#26C6DA',
    text: '#00838F',
    primary: '#26C6DA',
    primaryDark: '#00ACC1',
  };

  // Fonction submitBooking remplacée par mutation
  function submitBooking() {
    if (!selected) return;
    appointmentsMutations.create({
      start: selected.start,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      bike: form.bike || undefined,
      description: form.description || undefined,
    });
    // Reset UI après succès (géré par mutation onSuccess)
    appointmentsUI.closeDialog();
    appointmentsUI.resetForm();
  }

  function renderSlotsByDay() {
    const slotsByDay: { [key: string]: typeof slots } = {};
    const { isDayOpen, isAppointmentOnlyDay, getAppointmentOnlyPhone, getDayHours } = appointmentConfig;
    
    slots.forEach(slot => {
      const date = new Date(slot.start);
      const dayOfWeek = date.getDay();
      // Filtrer selon les jours d'ouverture configurés
      if (!isDayOpen(dayOfWeek)) return;
      
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
          const isAppointmentOnly = isAppointmentOnlyDay(dayOfWeek);
          const appointmentPhone = getAppointmentOnlyPhone();
          const dayHours = getDayHours(dayOfWeek);
          
          return (
            <Paper 
              key={day} 
              sx={{ 
                minWidth: 200, 
                p: 2, 
                bgcolor: isAppointmentOnly ? 'action.hover' : 'background.paper',
                border: isAppointmentOnly ? '2px dashed' : '1px solid',
                borderColor: isAppointmentOnly ? '#ff9800' : 'rgba(0, 0, 0, 0.12)'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>
                {day}
              </Typography>
              {isAppointmentOnly && (
                <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                  {appointmentPhone 
                    ? `RDV à confirmer au ${appointmentPhone}`
                    : 'RDV à confirmer par téléphone'}
                </Alert>
              )}
              {dayHours && !isAppointmentOnly && (
                <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                  Horaires : {dayHours.start} - {dayHours.end}
                </Alert>
              )}
              <Stack spacing={1}>
                {daySlots.map(slot => (
                  <Button
                    key={slot.start}
                    variant={slot.available ? (isAppointmentOnly ? "outlined" : "contained") : "outlined"}
                    size="small"
                    fullWidth
                    onClick={() => { if (slot.available) { appointmentsUI.openDialog(slot); } }}
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
        <ResponsiveContainer>
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
        </ResponsiveContainer>
      </Box>

      {/* Contenu */}
      <ResponsiveContainer sx={{ py: 4 }}>
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
              <Button variant="contained" onClick={() => load()} disabled={loading} fullWidth>
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
      </ResponsiveContainer>

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
        <ResponsiveContainer>
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Atelier Vélo+ - Upgraded Bikes - Tous droits réservés
          </Typography>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
