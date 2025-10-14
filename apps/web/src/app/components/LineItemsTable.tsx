"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Typography,
  Chip,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  Edit as ManualIcon,
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

interface LineItemsTableProps {
  lines: LineItem[];
  onUpdateLine: (index: number, updates: Partial<LineItem>) => void;
  onDeleteLine: (index: number) => void;
  isAutoEntrepreneur?: boolean;
}

export default function LineItemsTable({
  lines,
  onUpdateLine,
  onDeleteLine,
  isAutoEntrepreneur = false,
}: LineItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Vérification de sécurité
  if (!Array.isArray(lines)) {
    console.error("LineItemsTable: lines is not an array", lines);
    return <Typography color="error">Erreur: données invalides</Typography>;
  }

  function getLineIcon(type: string) {
    switch (type) {
      case "service":
        return <BuildIcon color="primary" fontSize="small" />;
      case "part":
        return <SettingsIcon color="secondary" fontSize="small" />;
      case "manual":
        return <ManualIcon color="action" fontSize="small" />;
      default:
        return null;
    }
  }

  function calculateLineTotals(line: LineItem) {
    const totalHT = line.priceHT * line.quantity;
    const totalTVA = totalHT * (line.vatRate / 100);
    const totalTTC = totalHT + totalTVA;
    return { totalHT, totalTVA, totalTTC };
  }

  function calculateGlobalTotals() {
    let totalHT = 0;
    let tva0 = 0;
    let tva10 = 0;
    let tva20 = 0;

    for (const line of lines) {
      const { totalHT: lineHT, totalTVA: lineTVA } = calculateLineTotals(line);
      totalHT += lineHT;

      if (line.vatRate === 0) tva0 += lineTVA;
      else if (line.vatRate === 10) tva10 += lineTVA;
      else if (line.vatRate === 20) tva20 += lineTVA;
    }

    const totalTVA = tva0 + tva10 + tva20;
    const totalTTC = totalHT + totalTVA;

    return { totalHT, tva0, tva10, tva20, totalTVA, totalTTC };
  }

  const totals = calculateGlobalTotals();

  if (lines.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell width="40px"></TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right" width="80px">
                Qté
              </TableCell>
              <TableCell align="right" width="100px">
                PU HT
              </TableCell>
              <TableCell align="center" width="80px">
                TVA
              </TableCell>
              <TableCell align="right" width="100px">
                Total HT
              </TableCell>
              <TableCell align="right" width="100px">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => {
              const { totalHT } = calculateLineTotals(line);
              const isEditing = editingIndex === index;

              return (
                <TableRow key={index} hover>
                  <TableCell>{getLineIcon(line.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {line.description}
                    </Typography>
                    {line.duration && (
                      <Typography variant="caption" color="text.secondary">
                        Durée estimée: {line.duration} min
                      </Typography>
                    )}
                    {line.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Note: {line.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <TextField
                        type="number"
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateLine(index, { quantity: parseInt(e.target.value) })
                        }
                        size="small"
                        sx={{ width: 60 }}
                        onBlur={() => setEditingIndex(null)}
                        autoFocus
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        onClick={() => setEditingIndex(index)}
                        sx={{ cursor: "pointer" }}
                      >
                        {line.quantity}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{line.priceHT.toFixed(2)} €</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${line.vatRate}%`}
                      size="small"
                      color={
                        line.vatRate === 0
                          ? "default"
                          : line.vatRate === 10
                            ? "primary"
                            : "secondary"
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {totalHT.toFixed(2)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onDeleteLine(index)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Totaux */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: "grey.50" }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Sous-total HT:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {totals.totalHT.toFixed(2)} €
            </Typography>
          </Stack>

          {totals.tva10 > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                TVA 10% (Prestations):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totals.tva10.toFixed(2)} €
              </Typography>
            </Stack>
          )}

          {totals.tva20 > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                TVA 20% (Pièces):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totals.tva20.toFixed(2)} €
              </Typography>
            </Stack>
          )}

          {totals.totalTVA > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Total TVA:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {totals.totalTVA.toFixed(2)} €
              </Typography>
            </Stack>
          )}

          <Divider />

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6" color="primary">
              TOTAL TTC:
            </Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {totals.totalTTC.toFixed(2)} €
            </Typography>
          </Stack>

          {isAutoEntrepreneur && totals.totalTVA === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              TVA non applicable, art. 293 B du CGI
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
