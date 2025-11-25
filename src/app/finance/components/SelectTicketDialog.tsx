"use client";

import { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { logger } from '@/lib/logger';

interface InvoiceableTicket {
  id: string;
  status: string;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  customerName: string;
  bikeId: string | null;
  bikeName: string;
  linesCount: number;
  totalHT: number;
}

interface SelectTicketDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ticketId: string) => void;
}

/**
 * SelectTicketDialog
 * 
 * Permet de sélectionner un ticket facturable pour créer une facture.
 * 
 * Critères:
 * - estimatedMinutes > 0 (chrono arrêté)
 * - Status: ready ou completed
 * - Pas encore facturé
 */
export default function SelectTicketDialog({
  open,
  onClose,
  onSelect,
}: SelectTicketDialogProps) {
  const [tickets, setTickets] = useState<InvoiceableTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Charger tickets facturables
  useEffect(() => {
    if (!open) return;

    async function loadTickets() {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem("jwt_token");
        const response = await fetch("/api/workshop/workorders/invoiceable", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des tickets");
        }

        const data = await response.json();
        setTickets(data);
        
        if (data.length === 0) {
          setError("Aucun ticket facturable trouvé. Créez un ticket avec chrono arrêté d'abord.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        logger.error("[SelectTicketDialog] Error:", message);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, [open]);

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId(null);
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <ReceiptLongIcon />
          <Typography variant="h6">Sélectionner un ticket à facturer</Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity={tickets.length === 0 ? "info" : "error"} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && tickets.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sélectionnez un ticket avec chrono arrêté pour créer une facture.
              La main d&apos;œuvre sera incluse automatiquement.
            </Typography>

            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {tickets.map((ticket) => (
                <ListItem
                  key={ticket.id}
                  disablePadding
                  sx={{ mb: 1 }}
                >
                  <ListItemButton
                    selected={selectedId === ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    sx={{
                      border: 1,
                      borderColor: selectedId === ticket.id ? "#1976d2" : "rgba(0, 0, 0, 0.12)",
                      borderRadius: 1,
                      "&:hover": {
                        borderColor: "primary.light",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="subtitle1" fontWeight="bold">
                            Ticket #{ticket.id.slice(-8)}
                          </Typography>
                          <Chip
                            label={ticket.status === "ready" ? "Prêt" : "Terminé"}
                            size="small"
                            color={ticket.status === "completed" ? "success" : "default"}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {ticket.customerName}
                              </Typography>
                            </Stack>
                            
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <DirectionsBikeIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {ticket.bikeName}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <AccessTimeIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {ticket.estimatedMinutes} min ({Math.ceil(ticket.estimatedMinutes / 30) * 0.5}h)
                              </Typography>
                            </Stack>
                            
                            <Typography variant="body2">
                              {ticket.linesCount} ligne{ticket.linesCount > 1 ? "s" : ""}
                            </Typography>

                            <Typography variant="body2" fontWeight="bold">
                              Total: {ticket.totalHT.toFixed(2)}€ HT
                            </Typography>
                          </Stack>

                          <Typography variant="caption" color="text.secondary">
                            Créé le {new Date(ticket.createdAt).toLocaleDateString("fr-FR")}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={!selectedId}
        >
          Créer Facture
        </Button>
      </DialogActions>
    </Dialog>
  );
}
