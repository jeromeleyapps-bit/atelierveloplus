"use client";

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface ImportProgressDialogProps {
  open: boolean;
  progress: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  status: "importing" | "complete" | "error";
  error?: string;
  onClose: () => void;
}

export default function ImportProgressDialog({
  open,
  progress,
  total,
  created,
  updated,
  skipped,
  status,
  error,
  onClose,
}: ImportProgressDialogProps) {
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>
        {status === "importing" && "Import en cours..."}
        {status === "complete" && "Import terminé"}
        {status === "error" && "Erreur d'import"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Progress bar */}
          {status === "importing" && (
            <>
              <LinearProgress variant="determinate" value={percent} sx={{ height: 10, borderRadius: 5 }} />
              <Typography variant="body2" color="text.secondary" align="center">
                {progress} / {total} lignes ({percent}%)
              </Typography>
            </>
          )}

          {/* Stats */}
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Créés:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                {created}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Mis à jour:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="primary.main">
                {updated}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Ignorés:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {skipped}
              </Typography>
            </Box>
          </Stack>

          {/* Success */}
          {status === "complete" && (
            <Alert severity="success" icon={<CheckCircle />}>
              Import réussi! {created + updated} produits traités.
            </Alert>
          )}

          {/* Error */}
          {status === "error" && (
            <Alert severity="error" icon={<ErrorIcon />}>
              {error || "Une erreur est survenue"}
            </Alert>
          )}

          {/* Actions */}
          {status !== "importing" && (
            <Button variant="contained" onClick={onClose} fullWidth>
              Fermer
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
