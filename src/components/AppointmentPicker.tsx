"use client";

import { useState } from "react";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import EventIcon from "@mui/icons-material/Event";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { setWorkOrderAppointment, updateWorkOrderAppointment, deleteWorkOrderAppointment } from "@/lib/api";

interface AppointmentPickerProps {
  workOrderId: string;
  currentAppointment?: string | null;
  onAppointmentChanged: () => void;
}

export function AppointmentPicker({
  workOrderId,
  currentAppointment,
  onAppointmentChanged,
}: AppointmentPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenDialog = () => {
    if (currentAppointment) {
      const d = new Date(currentAppointment);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
    } else {
      // Valeurs par défaut : demain à 14h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      setDate(tomorrow.toISOString().split("T")[0]);
      setTime("14:00");
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!date || !time) {
      setError("Veuillez remplir la date et l'heure");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appointmentDate = new Date(`${date}T${time}:00`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Bloquer si moins de 10h avant le RDV
      if (hoursUntilAppointment < 10) {
        setError("Le rendez-vous doit être pris au moins 10 heures à l'avance");
        setLoading(false);
        return;
      }

      if (currentAppointment) {
        await updateWorkOrderAppointment(workOrderId, {
          appointmentDate: appointmentDate.toISOString(),
          duration
        });
      } else {
        await setWorkOrderAppointment(workOrderId, {
          appointmentDate: appointmentDate.toISOString(),
          duration
        });
      }

      setDialogOpen(false);
      onAppointmentChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Annuler le rendez-vous ?")) return;

    setLoading(true);
    setError(null);

    try {
      await deleteWorkOrderAppointment(workOrderId);
      onAppointmentChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={600}>
            📅 Rendez-vous Retour
          </Typography>

          {currentAppointment ? (
            <Stack spacing={1.5}>
              <Paper sx={{ p: 1.5, bgcolor: "success.50", border: "1px solid", borderColor: "success.200" }}>
                <Typography variant="body2" fontWeight={500}>
                  📆{" "}
                  {new Date(currentAppointment).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ⏰{" "}
                  {new Date(currentAppointment).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Paper>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleOpenDialog}
                  disabled={loading}
                >
                  Modifier
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Annuler
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Button
              variant="contained"
              startIcon={<EventIcon />}
              onClick={handleOpenDialog}
              disabled={loading}
            >
              Définir un RDV
            </Button>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAppointment ? "Modifier le rendez-vous" : "Définir un rendez-vous"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Heure"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Durée (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              fullWidth
              inputProps={{ min: 15, max: 120, step: 15 }}
            />
            <Alert severity="info">
              Ce créneau sera automatiquement bloqué dans l&apos;agenda.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={loading || !date || !time}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
