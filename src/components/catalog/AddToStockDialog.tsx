"use client";
/**
 * Modal Ajouter à Mon Stock
 * Permet de transférer une offre fournisseur vers le catalogue avec prix de vente
 */

import { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import type { SupplierOffer } from "./SuppliersTab";

interface AddToStockDialogProps {
  open: boolean;
  offer: SupplierOffer | null;
  onClose: () => void;
  onConfirm: (data: AddToStockData) => void;
}

export interface AddToStockData {
  supplierOfferId: string;
  sku: string;
  name: string;
  category: "PIECES" | "EQUIPEMENTS" | "AUTRES";
  priceHT: number;
  priceTTC: number;
  vatRate: number;
  stockQty: number;
  minStock: number;
  barcode?: string;
}

export default function AddToStockDialog({
  open,
  offer,
  onClose,
  onConfirm,
}: AddToStockDialogProps) {
  const [margin, setMargin] = useState(1.5); // Marge par défaut 50%
  const [priceHT, setPriceHT] = useState(0);
  const [priceTTC, setPriceTTC] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [stockQty, setStockQty] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [category, setCategory] = useState<"PIECES" | "EQUIPEMENTS" | "AUTRES">(
    "PIECES"
  );
  const [sku, setSku] = useState("");

  // Calculer prix de vente quand l'offre change
  useEffect(() => {
    if (offer) {
      const calculatedPriceHT = offer.priceHT * margin;
      setPriceHT(calculatedPriceHT);
      setPriceTTC(calculatedPriceHT * (1 + vatRate / 100));
      setSku(offer.supplierSku);
    }
  }, [offer, margin, vatRate]);

  // Recalculer TTC quand HT change
  function handlePriceHTChange(value: number) {
    setPriceHT(value);
    setPriceTTC(value * (1 + vatRate / 100));
  }

  // Recalculer HT quand TTC change
  function handlePriceTTCChange(value: number) {
    setPriceTTC(value);
    setPriceHT(value / (1 + vatRate / 100));
  }

  // Recalculer quand TVA change
  function handleVatRateChange(value: number) {
    setVatRate(value);
    setPriceTTC(priceHT * (1 + value / 100));
  }

  function handleConfirm() {
    if (!offer) return;

    const data: AddToStockData = {
      supplierOfferId: offer.id,
      sku,
      name: offer.name,
      category,
      priceHT,
      priceTTC,
      vatRate: vatRate / 100,
      stockQty,
      minStock,
      barcode: offer.ean,
    };

    onConfirm(data);
    onClose();
  }

  if (!offer) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter à Mon Stock</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Info fournisseur */}
          <Box
            sx={{
              p: 2,
              bgcolor: "primary.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "primary.200",
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Pièce fournisseur
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {offer.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {offer.supplierName} • Réf: {offer.supplierSku}
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
              {offer.priceHT.toFixed(2)} € HT
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Prix d&apos;achat fournisseur
            </Typography>
          </Box>

          <Divider />

          {/* Calcul marge */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Calcul du prix de vente
            </Typography>
            <TextField
              fullWidth
              label="Marge multiplicatrice"
              type="number"
              value={margin}
              onChange={(e) => setMargin(parseFloat(e.target.value) || 1)}
              inputProps={{ min: 1, step: 0.1 }}
              helperText={`Prix achat × ${margin} = ${(
                offer.priceHT * margin
              ).toFixed(2)} € HT`}
            />
          </Box>

          {/* Prix de vente */}
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Prix de vente HT"
              type="number"
              value={priceHT.toFixed(2)}
              onChange={(e) =>
                handlePriceHTChange(parseFloat(e.target.value) || 0)
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="Prix de vente TTC"
              type="number"
              value={priceTTC.toFixed(2)}
              onChange={(e) =>
                handlePriceTTCChange(parseFloat(e.target.value) || 0)
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
            />
          </Stack>

          {/* TVA */}
          <TextField
            fullWidth
            label="TVA"
            type="number"
            value={vatRate}
            onChange={(e) =>
              handleVatRateChange(parseFloat(e.target.value) || 0)
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
          />

          <Divider />

          {/* Stock */}
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Stock initial"
              type="number"
              value={stockQty}
              onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
              helperText="Quantité reçue"
            />
            <TextField
              fullWidth
              label="Stock minimum"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
              helperText="Seuil d'alerte"
            />
          </Stack>

          {/* Catégorie */}
          <FormControl fullWidth>
            <InputLabel>Catégorie</InputLabel>
            <Select
              value={category}
              label="Catégorie"
              onChange={(e) => setCategory(e.target.value as "PIECES" | "EQUIPEMENTS" | "AUTRES")}
            >
              <MenuItem value="PIECES">Pièces</MenuItem>
              <MenuItem value="EQUIPEMENTS">Équipements</MenuItem>
              <MenuItem value="AUTRES">Autres</MenuItem>
            </Select>
          </FormControl>

          {/* SKU */}
          <TextField
            fullWidth
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            helperText="Référence dans votre catalogue (auto-rempli depuis fournisseur)"
          />

          {/* EAN */}
          {offer.ean && (
            <TextField
              fullWidth
              label="Code-barres EAN"
              value={offer.ean}
              disabled
              helperText="Importé depuis le fournisseur"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Ajouter au Stock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
