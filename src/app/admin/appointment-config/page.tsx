'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
// getLicenseInfo est serveur uniquement, on utilise l'API

interface OpeningHours {
  start: string;
  end: string;
}

interface AppointmentConfig {
  id: string;
  userId: string;
  openingDays: string; // JSON string
  openingHours: string; // JSON string
  appointmentOnlyDayEnabled: boolean;
  appointmentOnlyDay: string | null;
  appointmentOnlyDayPhone: string | null;
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

export default function AppointmentConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<{ tier: string } | null>(null);
  
  const [openingDays, setOpeningDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });
  
  const [openingHours, setOpeningHours] = useState<Record<string, OpeningHours>>({
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '18:00' },
    saturday: { start: '10:00', end: '17:00' },
    sunday: { start: '09:00', end: '18:00' },
  });
  
  const [appointmentOnlyDayEnabled, setAppointmentOnlyDayEnabled] = useState(false);
  const [appointmentOnlyDay, setAppointmentOnlyDay] = useState<string | null>(null);
  const [appointmentOnlyDayPhone, setAppointmentOnlyDayPhone] = useState<string | null>(null);

  useEffect(() => {
    // Charger info licence
    fetch('/api/admin/license/status')
      .then(res => res.json())
      .then(info => {
        setLicenseInfo(info);
      })
      .catch(err => {
        console.error('Error loading license info:', err);
      });

    // Charger configuration
    fetch('/api/admin/appointment-config')
      .then(res => res.json())
      .then((data: AppointmentConfig) => {
        if (data.openingDays) {
          setOpeningDays(JSON.parse(data.openingDays));
        }
        if (data.openingHours) {
          setOpeningHours(JSON.parse(data.openingHours));
        }
        setAppointmentOnlyDayEnabled(data.appointmentOnlyDayEnabled || false);
        setAppointmentOnlyDay(data.appointmentOnlyDay || null);
        setAppointmentOnlyDayPhone(data.appointmentOnlyDayPhone || null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading config:', err);
        setError('Erreur lors du chargement de la configuration');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/appointment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingDays: JSON.stringify(openingDays),
          openingHours: JSON.stringify(openingHours),
          appointmentOnlyDayEnabled,
          appointmentOnlyDay,
          appointmentOnlyDayPhone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess('Configuration sauvegardée avec succès !');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isPro = licenseInfo?.tier === 'pro' || licenseInfo?.tier === 'pro_lifetime' || licenseInfo?.tier === 'trial_pro';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <CalendarTodayIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4">Configuration des Rendez-vous Clients</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Jours d'ouverture */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Jours d'ouverture
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {DAYS.map(day => (
                <FormControlLabel
                  key={day.key}
                  control={
                    <Checkbox
                      checked={openingDays[day.key] || false}
                      onChange={(e) => {
                        setOpeningDays({ ...openingDays, [day.key]: e.target.checked });
                      }}
                    />
                  }
                  label={day.label}
                />
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Horaires */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Horaires d'ouverture
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {DAYS.map(day => (
                <Box key={day.key}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {day.label}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      label="Début"
                      type="time"
                      size="small"
                      value={openingHours[day.key]?.start || '09:00'}
                      onChange={(e) => {
                        setOpeningHours({
                          ...openingHours,
                          [day.key]: { ...openingHours[day.key], start: e.target.value },
                        });
                      }}
                      disabled={!openingDays[day.key]}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2">-</Typography>
                    <TextField
                      label="Fin"
                      type="time"
                      size="small"
                      value={openingHours[day.key]?.end || '18:00'}
                      onChange={(e) => {
                        setOpeningHours({
                          ...openingHours,
                          [day.key]: { ...openingHours[day.key], end: e.target.value },
                        });
                      }}
                      disabled={!openingDays[day.key]}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Option PRO : Un jour sur RDV uniquement */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Option PRO : Un jour sur rendez-vous uniquement
            </Typography>
            {!isPro && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Cette fonctionnalité nécessite une licence PRO ou PRO Lifetime
              </Alert>
            )}
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={appointmentOnlyDayEnabled}
                    onChange={(e) => {
                      setAppointmentOnlyDayEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setAppointmentOnlyDay(null);
                      }
                    }}
                    disabled={!isPro}
                  />
                }
                label="Activer un jour sur rendez-vous uniquement"
              />
              {appointmentOnlyDayEnabled && isPro && (
                <>
                  <TextField
                    select
                    label="Jour sur rendez-vous uniquement"
                    value={appointmentOnlyDay || ''}
                    onChange={(e) => setAppointmentOnlyDay(e.target.value)}
                    SelectProps={{ native: true }}
                    fullWidth
                    size="small"
                  >
                    <option value="">Sélectionner un jour</option>
                    {DAYS.map(day => (
                      <option key={day.key} value={day.key}>
                        {day.label}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    label="Numéro de téléphone (optionnel)"
                    value={appointmentOnlyDayPhone || ''}
                    onChange={(e) => setAppointmentOnlyDayPhone(e.target.value)}
                    placeholder="Récupéré depuis les informations du compte si vide"
                    fullWidth
                    size="small"
                    helperText="Si vide, le numéro sera récupéré depuis les informations du compte"
                  />
                </>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Bouton sauvegarder */}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

