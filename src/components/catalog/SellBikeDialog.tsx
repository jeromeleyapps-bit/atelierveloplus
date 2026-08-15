"use client";

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import type { Bike } from '@/hooks/useBikes';
import type { Customer } from '@/lib/api';
import { logger } from '@/lib/logger';

interface SellBikeDialogProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
  onConfirm: (data: SellBikeData) => void;
  isSelling: boolean;
}

export interface SellBikeData {
  customerId: string;
  type: 'INVOICE' | 'QUOTE';
  discount?: number;
  additionalLines?: Array<{
    description: string;
    quantity: number;
    unitPriceHT: number;
  }>;
}

export default function SellBikeDialog({
  open,
  bike,
  onClose,
  onConfirm,
  isSelling,
}: SellBikeDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [docType, setDocType] = useState<'INVOICE' | 'QUOTE'>('INVOICE');
  const [discount, setDiscount] = useState<number>(0);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      logger.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Charger liste clients — déclaré après loadCustomers, qui était auparavant
  // référencée avant sa déclaration.
  useEffect(() => {
    if (open) {
      loadCustomers();
    }
  }, [open, loadCustomers]);

  function handleConfirm() {
    if (!selectedCustomer || !bike) return;

    onConfirm({
      customerId: selectedCustomer.id,
      type: docType,
      discount: discount > 0 ? discount : undefined,
    });
  }

  function handleClose() {
    if (!isSelling) {
      setSelectedCustomer(null);
      setDocType('INVOICE');
      setDiscount(0);
      onClose();
    }
  }

  if (!bike) return null;

  const priceHT = bike.sellingPriceHT;
  const discountAmount = discount > 0 ? priceHT * (discount / 100) : 0;
  const finalPriceHT = priceHT - discountAmount;
  const tva = finalPriceHT * bike.vatRate;
  const priceTTC = finalPriceHT + tva;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6">Vendre : {bike.brand} {bike.model}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Infos vélo */}
          <Alert severity="info" variant="outlined">
            <Typography variant="body2">
              <strong>{bike.brand} {bike.model} ({bike.year})</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taille: {bike.size} • État: {bike.condition === 'NEW' ? 'Neuf' : 'Occasion'}
            </Typography>
          </Alert>

          {/* Sélection client */}
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => 
              `${option.firstName || ''} ${option.lastName || ''}${option.email ? ` (${option.email})` : ''}`
            }
            value={selectedCustomer}
            onChange={(_, value) => setSelectedCustomer(value)}
            loading={loadingCustomers}
            disabled={isSelling}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client *"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCustomers && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {/* Type document */}
          <FormControl disabled={isSelling}>
            <FormLabel>Type de document *</FormLabel>
            <RadioGroup
              row
              value={docType}
              onChange={(e) => setDocType(e.target.value as 'INVOICE' | 'QUOTE')}
            >
              <FormControlLabel value="INVOICE" control={<Radio />} label="Facture" />
              <FormControlLabel value="QUOTE" control={<Radio />} label="Devis" />
            </RadioGroup>
          </FormControl>

          <Divider />

          {/* Prix */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tarification
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Prix HT :</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {priceHT.toFixed(2)} €
                </Typography>
              </Stack>

              {/* Remise */}
              <TextField
                label="Remise (%)"
                type="number"
                size="small"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                disabled={isSelling}
                inputProps={{ min: 0, max: 100, step: 1 }}
              />

              {discount > 0 && (
                <Stack direction="row" justifyContent="space-between" color="warning.main">
                  <Typography variant="body2">Remise {discount}% :</Typography>
                  <Typography variant="body2">
                    - {discountAmount.toFixed(2)} €
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Total HT :</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {finalPriceHT.toFixed(2)} €
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">TVA {(bike.vatRate * 100).toFixed(0)}% :</Typography>
                <Typography variant="body2">
                  {tva.toFixed(2)} €
                </Typography>
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6">Total TTC :</Typography>
                <Typography variant="h6" color="primary">
                  {priceTTC.toFixed(2)} €
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSelling}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedCustomer || isSelling}
          startIcon={isSelling ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
        >
          {isSelling
            ? 'Génération...'
            : docType === 'INVOICE'
            ? 'Générer Facture'
            : 'Générer Devis'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
