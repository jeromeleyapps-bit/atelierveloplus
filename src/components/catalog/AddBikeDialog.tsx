"use client";

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import type { CreateBikeData } from '@/hooks/useBikesMutations';
import { getAccountSettings } from '@/lib/api';
import { logger } from '@/lib/logger';

interface AddBikeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreateBikeData) => void;
  isCreating: boolean;
}

export default function AddBikeDialog({
  open,
  onClose,
  onConfirm,
  isCreating,
}: AddBikeDialogProps) {
  // État formulaire - Champs requis
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [size, setSize] = useState('');
  const [purchasePriceHT, setPurchasePriceHT] = useState<number>(0);
  const [sellingPriceHT, setSellingPriceHT] = useState<number>(0);

  // État formulaire - Champs optionnels
  const [type, setType] = useState<string>('ROAD');
  const [condition, setCondition] = useState<string>('NEW');
  const [color, setColor] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [frameSize, setFrameSize] = useState('');
  const [frameMaterial, setFrameMaterial] = useState('');
  const [wheelSize, setWheelSize] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [groupset, setGroupset] = useState('');
  const [brakeType, setBrakeType] = useState('');
  const [drivetrain, setDrivetrain] = useState('');
  const [fork, setFork] = useState('');
  const [wheels, setWheels] = useState('');
  const [isElectric, setIsElectric] = useState(false);
  const [motor, setMotor] = useState('');
  const [battery, setBattery] = useState<number | ''>('');
  const [range, setRange] = useState<number | ''>('');
  const [mileage, setMileage] = useState<number | ''>(''); // Kilométrage
  const [conditionNotes, setConditionNotes] = useState('');
  const [maintenanceHistory, setMaintenanceHistory] = useState('');
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
  const [vatRate, setVatRate] = useState<number>(20);
  const [stock, setStock] = useState<number>(1);
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger statut auto-entrepreneur à l'ouverture
  useEffect(() => {
    if (open) {
      getAccountSettings().then(settings => {
        const isAE = settings?.isAutoEntrepreneur || false;
        setIsAutoEntrepreneur(isAE);
        // Ajuster TVA selon statut AE
        setVatRate(isAE ? 0 : 20);
      }).catch(err => {
        logger.error('Error loading account settings:', err);
        // Par défaut, TVA 20%
        setVatRate(20);
      });
    }
  }, [open]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!brand.trim()) newErrors.brand = 'Marque requise';
    if (!model.trim()) newErrors.model = 'Modèle requis';
    if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
      newErrors.year = 'Année invalide';
    }
    if (!size.trim()) newErrors.size = 'Taille requise';
    if (!purchasePriceHT || purchasePriceHT <= 0) {
      newErrors.purchasePriceHT = 'Prix d\'achat HT requis';
    }
    if (!sellingPriceHT || sellingPriceHT <= 0) {
      newErrors.sellingPriceHT = 'Prix de vente HT requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleConfirm() {
    if (!validateForm()) return;

    const data: CreateBikeData = {
      // Requis
      brand: brand.trim(),
      model: model.trim(),
      year,
      size: size.trim(),
      purchasePriceHT,
      sellingPriceHT,

      // Optionnels avec valeurs par défaut
      type,
      condition,
      vatRate: vatRate / 100, // Convertir % en décimal (20% -> 0.20)
      stock,

      // Optionnels
      color: color.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      frameSize: frameSize.trim() || undefined,
      frameMaterial: frameMaterial.trim() || undefined,
      wheelSize: wheelSize.trim() || undefined,
      weight: weight !== '' ? Number(weight) : undefined,
      groupset: groupset.trim() || undefined,
      brakeType: brakeType.trim() || undefined,
      drivetrain: drivetrain.trim() || undefined,
      fork: fork.trim() || undefined,
      wheels: wheels.trim() || undefined,
      isElectric,
      motor: motor.trim() || undefined,
      battery: battery !== '' ? Number(battery) : undefined,
      range: range !== '' ? Number(range) : undefined,
      mileage: mileage !== '' ? Number(mileage) : undefined,
      conditionNotes: conditionNotes.trim() || undefined,
      maintenanceHistory: maintenanceHistory.trim() || undefined,
      location: location.trim() || undefined,
      photos: photos.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      active: true,
    };

    onConfirm(data);
  }

  function handleClose() {
    if (!isCreating) {
      // Reset form
      setBrand('');
      setModel('');
      setYear(new Date().getFullYear());
      setSize('');
      setPurchasePriceHT(0);
      setSellingPriceHT(0);
      setType('ROAD');
      setCondition('NEW');
      setColor('');
      setSerialNumber('');
      setFrameSize('');
      setFrameMaterial('');
      setWheelSize('');
      setWeight('');
      setGroupset('');
      setBrakeType('');
      setDrivetrain('');
      setFork('');
      setWheels('');
      setIsElectric(false);
      setMotor('');
      setBattery('');
      setRange('');
      setMileage('');
      setConditionNotes('');
      setMaintenanceHistory('');
      setVatRate(20);
      setStock(1);
      setLocation('');
      setPhotos('');
      setInternalNotes('');
      setErrors({});
      onClose();
    }
  }

  // Calcul prix TTC
  const priceTTC = sellingPriceHT * (1 + vatRate / 100);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddIcon color="primary" />
          <Typography variant="h6">Ajouter un vélo en vente</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Section: Informations de base (requises) */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Informations de base *
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Marque *"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  error={!!errors.brand}
                  helperText={errors.brand}
                  fullWidth
                  required
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Modèle *"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  error={!!errors.model}
                  helperText={errors.model}
                  fullWidth
                  required
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Année *"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  error={!!errors.year}
                  helperText={errors.year}
                  fullWidth
                  required
                  disabled={isCreating}
                  inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Taille *"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  error={!!errors.size}
                  helperText={errors.size || 'Ex: S, M, L, 52cm, 54cm...'}
                  fullWidth
                  required
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Couleur"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={isCreating}>
                  <FormLabel>Type de vélo</FormLabel>
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    <MenuItem value="ROAD">Route</MenuItem>
                    <MenuItem value="MOUNTAIN">VTT</MenuItem>
                    <MenuItem value="CITY">Ville</MenuItem>
                    <MenuItem value="ELECTRIC">Électrique</MenuItem>
                    <MenuItem value="KIDS">Enfant</MenuItem>
                    <MenuItem value="OTHER">Autre</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={isCreating}>
                  <FormLabel>État</FormLabel>
                  <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <MenuItem value="NEW">Neuf</MenuItem>
                    <MenuItem value="USED">Occasion</MenuItem>
                    <MenuItem value="REPAIRED">Réparé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section: Prix (requis) */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Tarification *
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prix d'achat HT (€) *"
                  type="number"
                  value={purchasePriceHT}
                  onChange={(e) => setPurchasePriceHT(Number(e.target.value))}
                  error={!!errors.purchasePriceHT}
                  helperText={errors.purchasePriceHT}
                  fullWidth
                  required
                  disabled={isCreating}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prix de vente HT (€) *"
                  type="number"
                  value={sellingPriceHT}
                  onChange={(e) => setSellingPriceHT(Number(e.target.value))}
                  error={!!errors.sellingPriceHT}
                  helperText={errors.sellingPriceHT}
                  fullWidth
                  required
                  disabled={isCreating}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={isAutoEntrepreneur ? "TVA (%) - Auto-Entrepreneur" : "TVA (%)"}
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  fullWidth
                  disabled={isCreating || isAutoEntrepreneur}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  helperText={isAutoEntrepreneur ? "TVA 0% pour auto-entrepreneur" : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Stock (quantité)"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  fullWidth
                  disabled={isCreating}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              {sellingPriceHT > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info" variant="outlined">
                    <Typography variant="body2">
                      Prix de vente TTC: <strong>{priceTTC.toFixed(2)} €</strong>
                      {purchasePriceHT > 0 && (
                        <> • Marge: <strong>{((sellingPriceHT - purchasePriceHT) / purchasePriceHT * 100).toFixed(1)}%</strong></>
                      )}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Section: Caractéristiques techniques (optionnelles) */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Caractéristiques techniques
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Numéro de série"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Taille de cadre"
                  value={frameSize}
                  onChange={(e) => setFrameSize(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Matériau cadre"
                  value={frameMaterial}
                  onChange={(e) => setFrameMaterial(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="Ex: Aluminium, Carbone, Acier..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Taille roues"
                  value={wheelSize}
                  onChange={(e) => setWheelSize(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder='Ex: 26", 27.5", 28", 29"...'
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Poids (kg)"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  fullWidth
                  disabled={isCreating}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Groupe"
                  value={groupset}
                  onChange={(e) => setGroupset(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="Ex: Shimano 105, SRAM Apex..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Type de frein"
                  value={brakeType}
                  onChange={(e) => setBrakeType(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="Ex: Disque hydraulique, Cantilever..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Transmission"
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="Ex: 1x11, 2x10..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fourche"
                  value={fork}
                  onChange={(e) => setFork(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Roues"
                  value={wheels}
                  onChange={(e) => setWheels(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section: Vélo électrique (optionnelle) */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Vélo électrique
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isElectric}
                      onChange={(e) => setIsElectric(e.target.checked)}
                      disabled={isCreating}
                    />
                  }
                  label="Vélo électrique"
                />
              </Grid>
              {isElectric && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Moteur"
                      value={motor}
                      onChange={(e) => setMotor(e.target.value)}
                      fullWidth
                      disabled={isCreating}
                      placeholder="Ex: Bosch, Shimano Steps..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Batterie (Wh)"
                      type="number"
                      value={battery}
                      onChange={(e) => setBattery(e.target.value === '' ? '' : Number(e.target.value))}
                      fullWidth
                      disabled={isCreating}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Autonomie (km)"
                      type="number"
                      value={range}
                      onChange={(e) => setRange(e.target.value === '' ? '' : Number(e.target.value))}
                      fullWidth
                      disabled={isCreating}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Kilométrage (km)"
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                      fullWidth
                      disabled={isCreating}
                      inputProps={{ min: 0 }}
                      helperText="Kilométrage total du vélo"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Section: Informations supplémentaires */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Informations supplémentaires
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Notes sur l'état"
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={isCreating}
                  placeholder="Décrire l'état du vélo..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Historique de maintenance"
                  value={maintenanceHistory}
                  onChange={(e) => setMaintenanceHistory(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={isCreating}
                  placeholder="Entretiens effectués..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Localisation"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="Ex: Magasin, Entrepôt A..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Photos (URLs séparées par des virgules)"
                  value={photos}
                  onChange={(e) => setPhotos(e.target.value)}
                  fullWidth
                  disabled={isCreating}
                  placeholder="https://..., https://..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes internes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={isCreating}
                  placeholder="Notes privées (non visibles par les clients)..."
                />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isCreating}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isCreating}
          startIcon={isCreating ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {isCreating ? 'Création...' : 'Ajouter le vélo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

