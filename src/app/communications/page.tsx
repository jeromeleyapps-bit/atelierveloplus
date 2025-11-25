"use client";

// ✅ Hooks personnalisés
import { useCommunicationsData } from '@/hooks/useCommunicationsData';
import { useCommunicationsUI } from '@/hooks/useCommunicationsUI';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PendingIcon from "@mui/icons-material/Pending";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import RequireAuth from "../components/RequireAuth";
import {} from "@/lib/api";

export default function CommunicationsPage() {
  // ✅ Hooks personnalisés
  const communicationsData = useCommunicationsData();
  const communicationsUI = useCommunicationsUI();

  // Alias locaux
  const communications = communicationsData.communications;
  const loading = communicationsData.isLoading;
  const typeFilter = communicationsData.typeFilter;
  const setTypeFilter = communicationsData.setTypeFilter;
  const statusFilter = communicationsData.statusFilter;
  const setStatusFilter = communicationsData.setStatusFilter;
  const refresh = communicationsData.refetch;

  const selectedComm = communicationsUI.selectedComm;
  const detailsOpen = communicationsUI.detailsOpen;
  const setDetailsOpen = communicationsUI.setDetailsOpen;
  const openDetails = communicationsUI.openDetails;

  function getStatusIcon(status: string) {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'pending':
        return <PendingIcon fontSize="small" color="warning" />;
      default:
        return null;
    }
  }

  function getStatusColor(status: string): "success" | "error" | "warning" | "default" {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  }

  function getEventLabel(event: string): string {
    const labels: Record<string, string> = {
      'quote_created': 'Devis créé',
      'bike_ready': 'Vélo prêt',
      'order_arrived': 'Commande arrivée',
      'invoice_sent': 'Facture envoyée',
    };
    return labels[event] || event;
  }

  function formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <RequireAuth>
      <PageShell title="Communications" maxWidth="lg">
        <SectionCard title="Historique des communications" icon={<EmailIcon color="primary" />}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="email">📧 Email</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                label="Statut"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="sent">Envoyé</MenuItem>
                <MenuItem value="delivered">Délivré</MenuItem>
                <MenuItem value="failed">Échoué</MenuItem>
                <MenuItem value="pending">En attente</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={() => refresh()}>
              Actualiser
            </Button>
          </Stack>

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Événement</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Destinataire</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {communications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" py={4}>
                          Aucune communication
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    communications.map((comm) => (
                      <TableRow key={comm.id} hover>
                        <TableCell>{formatDate(comm.sentAt || comm.createdAt)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <EmailIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              Email
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getEventLabel(comm.event)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {(comm as { Customer?: { firstName?: string; lastName?: string } }).Customer?.firstName} {(comm as { Customer?: { firstName?: string; lastName?: string } }).Customer?.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {comm.recipient}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {getStatusIcon(comm.status)}
                            <Chip
                              label={comm.status}
                              size="small"
                              color={getStatusColor(comm.status)}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                                                        onClick={() => openDetails(comm as any)}
                          >
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Détails de la communication</DialogTitle>
          <DialogContent>
            {selectedComm && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography>
                  <strong>Type :</strong> 📧 Email
                </Typography>
                <Typography>
                  <strong>Événement :</strong> {getEventLabel(selectedComm.event)}
                </Typography>
                <Typography>
                  <strong>Destinataire :</strong> {selectedComm.recipient}
                </Typography>
                <Typography>
                  <strong>Statut :</strong>{' '}
                  <Chip
                    label={selectedComm.status}
                    size="small"
                    color={getStatusColor(selectedComm.status)}
                  />
                </Typography>
                <Typography>
                  <strong>Envoyé le :</strong> {formatDate(selectedComm.sentAt)}
                </Typography>
                {selectedComm.subject && (
                  <Typography>
                    <strong>Sujet :</strong> {selectedComm.subject}
                  </Typography>
                )}
                {selectedComm.error && (
                  <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                    <Typography color="error.contrastText">
                      <strong>Erreur :</strong> {selectedComm.error}
                    </Typography>
                  </Paper>
                )}
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Contenu :
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: 300,
                      overflow: 'auto'
                    }}
                  >
                    {selectedComm.content}
                  </Typography>
                </Paper>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>
      </PageShell>
    </RequireAuth>
  );
}
