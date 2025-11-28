"use client";

import { useState, useEffect } from "react";
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import { logger } from '@/lib/logger';

export interface LineItem {
  id?: string;
  type: "service" | "part" | "manual";
  description: string;
  quantity: number;
  priceHT: number;
  vatRate: number;
  duration?: number;
  sourceId?: string;
  notes?: string;
}

interface ServiceRate {
  id: string;
  name: string;
  description?: string;
  priceHT: number;
  bikeType?: string | null;
  category?: string | null;
  duration?: number | null;
  active: boolean;
}

interface CatalogItem {
  id: string;
  sku?: string | null;
  name: string;
  description?: string;
  priceHT: number;
  stockQty?: number | null;
  active?: boolean;
}

interface LineItemSelectorProps {
  onAddLine: (line: LineItem) => void;
  bikeType?: string;
  isAutoEntrepreneur?: boolean;
}

export default function LineItemSelector({
  onAddLine,
  bikeType,
  isAutoEntrepreneur = false,
}: LineItemSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogType, setDialogType] = useState<"service" | "part" | "manual" | null>(null);
  
  // États pour les options
  const [serviceRates, setServiceRates] = useState<ServiceRate[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  
  // États pour le formulaire
  const [selectedService, setSelectedService] = useState<ServiceRate | null>(null);
  const [selectedPart, setSelectedPart] = useState<CatalogItem | null>(null);
  const [isCustomService, setIsCustomService] = useState(false);
  const [isCustomPart, setIsCustomPart] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 1,
    priceHT: 0,
    vatRate: isAutoEntrepreneur ? 0 : 10,
    duration: 0,
    notes: "",
    customType: "service",
  });

  useEffect(() => {
    loadServiceRates();
    loadCatalogItems();
  }, []);

  async function loadServiceRates() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/service-rates?active=true", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setServiceRates(data.serviceRates || []);
    } catch (error) {
      logger.error("Error loading service rates:", error);
    }
  }

  async function loadCatalogItems() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/catalog/items", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        logger.error("Catalog API error:", response.status);
        setCatalogItems([]);
        return;
      }
      
      const data = await response.json();
      // L'API peut retourner un objet avec items ou directement un tableau
      const items: CatalogItem[] = Array.isArray(data) ? data : (data.items || []);
      setCatalogItems(items.filter((item) => item.active !== false) || []);
    } catch (error) {
      logger.error("Error loading catalog items:", error);
      setCatalogItems([]);
    }
  }

  function openDialog(type: "service" | "part" | "manual") {
    setDialogType(type);
    setAnchorEl(null);
    
    // Reset form
    setSelectedService(null);
    setSelectedPart(null);
    setIsCustomService(false);
    setIsCustomPart(false);
    setFormData({
      name: "",
      description: "",
      quantity: 1,
      priceHT: 0,
      vatRate: isAutoEntrepreneur ? 0 : (type === "service" ? 10 : 20),
      duration: 0,
      notes: "",
      customType: "service",
    });
  }

  function handleServiceSelect(service: ServiceRate) {
    setSelectedService(service);
    setFormData({
      ...formData,
      name: service.name,
      description: service.name,
      priceHT: service.priceHT,
      vatRate: isAutoEntrepreneur ? 0 : 10,
      duration: service.duration || 0,
    });
  }

  function handlePartSelect(part: CatalogItem) {
    setSelectedPart(part);
    setFormData({
      ...formData,
      description: part.name,
      priceHT: part.priceHT,
      vatRate: isAutoEntrepreneur ? 0 : 20,
    });
  }

  function handleAdd() {
    const line: LineItem = {
      type: dialogType!,
      description: formData.description,
      quantity: formData.quantity,
      priceHT: formData.priceHT,
      vatRate: formData.vatRate,
      duration: dialogType === "service" ? formData.duration : undefined,
      sourceId: selectedService?.id || selectedPart?.id || undefined,
      notes: formData.notes || undefined,
    };

    onAddLine(line);
    
    // Notifier mise à jour stock si c'est une pièce (via CustomEvent global)
    if (dialogType === "part" && selectedPart) {
      logger.info('[LINEITEM] Émission event stockUpdated', { partName: selectedPart.name, quantity: -formData.quantity });
      window.dispatchEvent(new CustomEvent('stockUpdated', {
        detail: {
          itemId: selectedPart.id,
          sku: selectedPart.sku,
          name: selectedPart.name,
          quantityChange: -formData.quantity,
          timestamp: Date.now(),
        }
      }));
    }
    
    setDialogType(null);
  }

  // Filtrer les prestations par type de vélo
  const filteredServices = serviceRates.filter((service) => {
    if (!bikeType) return true;
    return !service.bikeType || service.bikeType === bikeType;
  });

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        Ajouter une ligne
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => openDialog("service")}>
          <ListItemIcon>
            <BuildIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Prestation (grille tarifaire)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openDialog("part")}>
          <ListItemIcon>
            <SettingsIcon color="secondary" />
          </ListItemIcon>
          <ListItemText>Pièce (catalogue)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openDialog("manual")}>
          <ListItemIcon>
            <EditIcon color="action" />
          </ListItemIcon>
          <ListItemText>Saisie manuelle</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog Prestation */}
      <Dialog
        open={dialogType === "service"}
        onClose={() => setDialogType(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ajouter une prestation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isCustomService}
                  onChange={(e) => {
                    setIsCustomService(e.target.checked);
                    if (e.target.checked) {
                      setSelectedService(null);
                      setFormData({ ...formData, name: "", description: "", priceHT: 0 });
                    }
                  }}
                />
              }
              label="Prestation personnalisée"
            />

            {!isCustomService ? (
              <Autocomplete
                options={filteredServices}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => option.id}
                value={selectedService}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) => value && handleServiceSelect(value)}
                renderOption={(props, option) => {
                  const { key: _key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option.id} {...otherProps}>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.priceHT.toFixed(2)}€ HT
                          {option.duration && ` • ${option.duration} min`}
                          {option.bikeType && ` • ${option.bikeType}`}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Rechercher une prestation" />
                )}
              />
            ) : (
              <TextField
                label="Nom de la prestation"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({ ...formData, name, description: name });
                }}
                fullWidth
                required
                helperText="Nom de la prestation personnalisée"
              />
            )}

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Quantité"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                sx={{ width: 100 }}
              />
              <TextField
                label={isAutoEntrepreneur ? "Prix TTC" : "Prix HT"}
                type="number"
                value={formData.priceHT}
                onChange={(e) => setFormData({ ...formData, priceHT: parseFloat(e.target.value) })}
                fullWidth
                helperText={isAutoEntrepreneur ? "Tarif TTC (Auto-Entrepreneur)" : "Tarif HT"}
              />
              <TextField
                label="Durée (min)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                sx={{ width: 120 }}
              />
            </Stack>

            {!isAutoEntrepreneur && (
              <Box>
                <Chip label={`TVA ${formData.vatRate}%`} color="primary" />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>Annuler</Button>
          <Button 
            onClick={handleAdd} 
            variant="contained" 
            disabled={isCustomService ? (!formData.name || !formData.priceHT) : !formData.description}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Pièce */}
      <Dialog
        open={dialogType === "part"}
        onClose={() => setDialogType(null)}
        maxWidth="sm"
        fullWidth
        key={`part-${isCustomPart}`}
      >
        <DialogTitle>Ajouter une pièce</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isCustomPart}
                  onChange={(e) => {
                    setIsCustomPart(e.target.checked);
                    if (e.target.checked) {
                      setSelectedPart(null);
                      setFormData({ ...formData, name: "", description: "", priceHT: 0 });
                    }
                  }}
                />
              }
              label="Pièce personnalisée"
            />

            {!isCustomPart ? (
              <Autocomplete
                options={catalogItems}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => option.id}
                value={selectedPart}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) => value && handlePartSelect(value)}
                renderOption={(props, option) => {
                  const { key: _key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option.id} {...otherProps}>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.priceHT.toFixed(2)}€ HT • Stock: {option.stockQty}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Rechercher une pièce" />
                )}
              />
            ) : (
              <TextField
                label="Nom de la pièce"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({ ...formData, name, description: name });
                }}
                fullWidth
                required
                autoFocus
                helperText="Nom de la pièce personnalisée"
              />
            )}

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              disabled={!isCustomPart && !selectedPart}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Quantité"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                sx={{ width: 100 }}
                inputProps={{ min: 1 }}
              />
              <TextField
                label={isAutoEntrepreneur ? "Prix TTC" : "Prix HT"}
                type="number"
                value={formData.priceHT}
                onChange={(e) => setFormData({ ...formData, priceHT: parseFloat(e.target.value) || 0 })}
                fullWidth
                helperText={isAutoEntrepreneur ? "Tarif TTC (Auto-Entrepreneur)" : "Tarif HT"}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Stack>

            {!isAutoEntrepreneur && (
              <Box>
                <Chip label={`TVA ${formData.vatRate}%`} color="secondary" />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>Annuler</Button>
          <Button 
            onClick={handleAdd} 
            variant="contained" 
            disabled={isCustomPart ? (!formData.name || !formData.priceHT) : !formData.description}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Saisie Manuelle */}
      <Dialog
        open={dialogType === "manual"}
        onClose={() => setDialogType(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Saisie manuelle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: Réparation spéciale cadre"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Quantité"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                sx={{ width: 100 }}
              />
              <TextField
                label="Prix unitaire HT"
                type="number"
                value={formData.priceHT}
                onChange={(e) => setFormData({ ...formData, priceHT: parseFloat(e.target.value) })}
                fullWidth
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.customType}
                onChange={(e) => {
                  const type = e.target.value;
                  setFormData({
                    ...formData,
                    customType: type,
                    // ✅ FIX: Respecter le mode auto-entrepreneur
                    vatRate: isAutoEntrepreneur ? 0 : (type === "service" ? 10 : 20),
                  });
                }}
              >
                <MenuItem value="service">
                  {isAutoEntrepreneur ? "Prestation" : "Prestation (TVA 10%)"}
                </MenuItem>
                <MenuItem value="part">
                  {isAutoEntrepreneur ? "Pièce" : "Pièce (TVA 20%)"}
                </MenuItem>
                <MenuItem value="custom">Personnalisé</MenuItem>
              </Select>
            </FormControl>

            {formData.customType === "custom" && !isAutoEntrepreneur && (
              <TextField
                label="Taux TVA (%)"
                type="number"
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                fullWidth
                helperText="Mode Auto-Entrepreneur : TVA 0% obligatoire"
              />
            )}
            
            {!isAutoEntrepreneur && formData.customType !== "custom" && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  TVA: {formData.vatRate}%
                </Typography>
              </Box>
            )}
            
            {isAutoEntrepreneur && (
              <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                  ⚠️ Mode Auto-Entrepreneur : TVA non applicable (0%)
                </Typography>
              </Box>
            )}

            <TextField
              label="Notes (optionnel)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>Annuler</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!formData.description}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
