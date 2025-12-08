"use client";

import { useState } from "react";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import ManualIcon from '@mui/icons-material/Edit';
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

interface LineItemsTableProps {
  lines: LineItem[];
  onUpdateLine: (index: number, updates: Partial<LineItem>) => void;
  onDeleteLine: (index: number) => void;
}

export default function LineItemsTable({
  lines,
  onUpdateLine,
  onDeleteLine,
}: LineItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Vérification de sécurité
  if (!Array.isArray(lines)) {
    logger.error("LineItemsTable: lines is not an array", lines);
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
          Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
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

          {totals.totalTVA === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              TVA non applicable (taux 0%)
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
