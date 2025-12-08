"use client";

import { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import type { InvoiceLine } from "@/lib/api";
import VatRateSelector from "./VatRateSelector";

interface EditInvoiceLineDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (line: Partial<InvoiceLine>) => Promise<void>;
  line: InvoiceLine | null;
  isAutoEntrepreneur: boolean;
}

export default function EditInvoiceLineDialog({
  open,
  onClose,
  line,
  onSave,
  isAutoEntrepreneur,
}: EditInvoiceLineDialogProps) {
  const [formData, setFormData] = useState({
    description: "",
    qty: 1,
    unitPriceHT: 0,
    vatRate: 20,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Charger données ligne quand dialog s'ouvre
  useEffect(() => {
    if (line && open) {
      setFormData({
        description: line.description || "",
        qty: line.qty || 1,
        unitPriceHT: line.unitPriceHT || 0,
        vatRate: line.vatRate || 20,
      });
    }
  }, [line, open]);

  const handleSave = async () => {
    if (!line) return;
    
    if (!formData.description.trim()) {
      setError("La description est obligatoire");
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      await onSave({
        description: formData.description,
        qty: formData.qty,
        unitPriceHT: formData.unitPriceHT,
        vatRate: isAutoEntrepreneur ? 0 : formData.vatRate,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier la ligne</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Quantité"
            type="number"
            value={formData.qty}
            onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
            inputProps={{ min: 0, step: 0.5 }}
            fullWidth
            required
          />
          
          <TextField
            label="Prix unitaire HT (€)"
            type="number"
            value={formData.unitPriceHT}
            onChange={(e) => setFormData({ ...formData, unitPriceHT: parseFloat(e.target.value) || 0 })}
            inputProps={{ min: 0, step: 0.01 }}
            fullWidth
            required
          />
          
          {!isAutoEntrepreneur && (
            <VatRateSelector
              value={formData.vatRate}
              onChange={(value) => setFormData({ ...formData, vatRate: value })}
              label="Taux de TVA"
              fullWidth
            />
          )}
          
          {isAutoEntrepreneur && (
            <Alert severity="info">
              TVA non applicable (statut auto-entrepreneur)
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
