"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Stack,
  Chip,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

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
  const [serviceRates, setServiceRates] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  
  // États pour le formulaire
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedPart, setSelectedPart] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    quantity: 1,
    priceHT: 0,
    vatRate: 10,
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
      const response = await fetch("/api/admin/service-rates?active=true", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setServiceRates(data.serviceRates || []);
    } catch (error) {
      console.error("Error loading service rates:", error);
    }
  }

  async function loadCatalogItems() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/catalog/items", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        console.error("Catalog API error:", response.status);
        setCatalogItems([]);
        return;
      }
      
      const data = await response.json();
      // L'API peut retourner un objet avec items ou directement un tableau
      const items = Array.isArray(data) ? data : (data.items || []);
      setCatalogItems(items.filter((item: any) => item.active) || []);
    } catch (error) {
      console.error("Error loading catalog items:", error);
      setCatalogItems([]);
    }
  }

  function openDialog(type: "service" | "part" | "manual") {
    setDialogType(type);
    setAnchorEl(null);
    
    // Reset form
    setSelectedService(null);
    setSelectedPart(null);
    setFormData({
      description: "",
      quantity: 1,
      priceHT: 0,
      vatRate: isAutoEntrepreneur ? 0 : (type === "service" ? 10 : 20),
      duration: 0,
      notes: "",
      customType: "service",
    });
  }

  function handleServiceSelect(service: any) {
    setSelectedService(service);
    setFormData({
      ...formData,
      description: service.name,
      priceHT: service.priceHT,
      vatRate: isAutoEntrepreneur ? 0 : 10,
      duration: service.duration || 0,
    });
  }

  function handlePartSelect(part: any) {
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
            <Autocomplete
              options={filteredServices}
              getOptionLabel={(option) => option.name}
              value={selectedService}
              onChange={(_, value) => value && handleServiceSelect(value)}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
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
                label="Prix HT"
                type="number"
                value={formData.priceHT}
                onChange={(e) => setFormData({ ...formData, priceHT: parseFloat(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Durée (min)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                sx={{ width: 120 }}
              />
            </Stack>

            <Box>
              <Chip label={`TVA ${formData.vatRate}%`} color="primary" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>Annuler</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!formData.description}>
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
      >
        <DialogTitle>Ajouter une pièce</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={catalogItems}
              getOptionLabel={(option) => option.name}
              value={selectedPart}
              onChange={(_, value) => value && handlePartSelect(value)}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
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

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
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
                label="Prix HT"
                type="number"
                value={formData.priceHT}
                onChange={(e) => setFormData({ ...formData, priceHT: parseFloat(e.target.value) })}
                fullWidth
              />
            </Stack>

            <Box>
              <Chip label={`TVA ${formData.vatRate}%`} color="secondary" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogType(null)}>Annuler</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!formData.description}>
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
                    vatRate: isAutoEntrepreneur ? 0 : (type === "service" ? 10 : 20),
                  });
                }}
              >
                <MenuItem value="service">Prestation (TVA {isAutoEntrepreneur ? 0 : 10}%)</MenuItem>
                <MenuItem value="part">Pièce (TVA {isAutoEntrepreneur ? 0 : 20}%)</MenuItem>
                <MenuItem value="custom">Personnalisé</MenuItem>
              </Select>
            </FormControl>

            {formData.customType === "custom" && (
              <TextField
                label="Taux TVA (%)"
                type="number"
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                fullWidth
              />
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
