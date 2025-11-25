"use client";

// ✅ Hooks personnalisés
import { useBookingLocalData } from '@/hooks/useBookingLocalData';
import { useAppointmentsUI } from '@/hooks/useAppointmentsUI';
import { useAppointmentsMutations } from '@/hooks/useAppointmentsMutations';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export default function PublicBookingPage() {
  // ✅ Hooks personnalisés
  const bookingData = useBookingLocalData();
  const bookingUI = useAppointmentsUI();
  const bookingMutations = useAppointmentsMutations({
    onSuccess: (msg) => bookingUI.setSubmitMsg({ ok: true, msg }),
    onError: (msg) => bookingUI.setSubmitMsg({ ok: false, msg }),
  });

  // Alias locaux
  const rangeStart = bookingData.rangeStart;
  const setRangeStart = bookingData.setRangeStart;
  const rangeEnd = bookingData.rangeEnd;
  const setRangeEnd = bookingData.setRangeEnd;
  const loading = bookingData.isLoading;
  const slots = bookingData.slots;
  const error = bookingData.slotsError;
  const load = () => bookingData.loadSlots();
  const customers = bookingData.customers;
  const loadingCustomers = bookingData.isLoadingCustomers;

  const open = bookingUI.open;
  const setOpen = bookingUI.setOpen;
  const selected = bookingUI.selected;
  const _setSelected = bookingUI.setSelected;
  const form = bookingUI.form;
  const setForm = bookingUI.setForm;
  const submitting = bookingMutations.isCreating;
  const submitMsg = bookingUI.submitMsg;
  const _setSubmitMsg = bookingUI.setSubmitMsg;

  function selectCustomer(customer: Customer | null) {
    if (!customer) return;
    setForm({
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || '',
      email: customer.email || '',
      phone: customer.phone || '',
      bike: '',
      description: ''
    });
  }

  function submitBooking() {
    if (!selected) return;
    bookingMutations.create({
      start: selected.start,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      bike: form.bike || undefined,
      description: form.description || undefined,
    });
    bookingUI.closeDialog();
    bookingUI.resetForm();
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
                borderColor: isSaturday ? '#ff9800' : 'rgba(0, 0, 0, 0.12)'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>
                {day}
              </Typography>
              {isSaturday && (
                <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                  RDV à confirmer au 0768184875
                </Alert>
              )}
              <Stack spacing={1}>
                {daySlots.map(slot => (
                  <Button
                    key={slot.start}
                    variant={slot.available ? (isSaturday ? "outlined" : "contained") : "outlined"}
                    size="small"
                    fullWidth
                    onClick={() => { if (slot.available) { bookingUI.openDialog(slot); } }}
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
            <Button variant="contained" onClick={() => load()} disabled={loading}>Rechercher</Button>
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
              getOptionLabel={(option: Customer | string) => {
                if (typeof option === 'string') return option;
                const name = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                return name || option.email || 'Client sans nom';
              }}
              renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: Customer) => {
                const { ...otherProps } = props;
                return (
                  <li key={option.id} {...otherProps}>
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
              freeSolo={true}
              loading={loadingCustomers}
              onChange={(_e, value: Customer | string | null) => {
                if (value && typeof value !== 'string') {
                  // Client existant sélectionné
                  selectCustomer(value);
                } else if (typeof value === 'string') {
                  // Nouveau nom saisi
                  setForm({ ...form, name: value });
                }
              }}
              inputValue={form.name}
              onInputChange={(_e, value) => {
                // Permet la saisie libre
                setForm({ ...form, name: value });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nom (ou sélectionnez un client existant)"
                  required
                  fullWidth
                />
              )}
            />
            <Divider sx={{ my: 2 }}>Coordonnées</Divider>
            <TextField label="Email" type="email" fullWidth value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} />
            <TextField label="Téléphone" fullWidth value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} />
            
            <Divider sx={{ my: 2 }}>Vélo</Divider>
            <TextField label="Marque et modèle du vélo" fullWidth value={form.bike} onChange={e=>setForm({ ...form, bike: e.target.value })} placeholder="Ex: Giant TCR, Specialized Allez..." />
            
            <Divider sx={{ my: 2 }}>Besoin</Divider>
            <TextField label="Description du besoin" multiline minRows={3} fullWidth value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} placeholder="Décrivez le problème ou l'entretien souhaité..." />
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
