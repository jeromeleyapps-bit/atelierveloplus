"use client";

import {
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import {
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

interface FinancialSummaryCardProps {
  totals: {
    totalHT: number;
    tva0?: number;
    tva10?: number;
    tva20?: number;
    totalTVA: number;
    totalTTC: number;
  };
  isAutoEntrepreneur?: boolean;
  elevation?: number;
  highlighted?: boolean;
}

export default function FinancialSummaryCard({
  totals,
  isAutoEntrepreneur = false,
  elevation = 0,
  highlighted = false,
}: FinancialSummaryCardProps) {
  return (
    <Card
      elevation={elevation}
      sx={{
        border: highlighted ? 2 : 1,
        borderColor: highlighted ? 'primary.main' : 'divider',
        bgcolor: highlighted ? 'primary.50' : 'background.paper',
      }}
    >
      <CardHeader
        avatar={<ReceiptIcon color={highlighted ? 'primary' : 'action'} />}
        title="Résumé Financier"
        titleTypographyProps={{
          variant: 'h6',
          fontWeight: highlighted ? 'bold' : 'medium',
        }}
      />
      <CardContent>
        <Stack spacing={1.5}>
          {/* Sous-total HT */}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Sous-total HT</Typography>
            <Typography variant="body2" fontWeight="medium">
              {totals.totalHT.toFixed(2)} €
            </Typography>
          </Stack>

          {/* TVA détaillée */}
          {!isAutoEntrepreneur && (
            <>
              {totals.tva10 !== undefined && totals.tva10 > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    TVA 10% (MO)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {totals.tva10.toFixed(2)} €
                  </Typography>
                </Stack>
              )}
              {totals.tva20 !== undefined && totals.tva20 > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    TVA 20% (Pièces)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {totals.tva20.toFixed(2)} €
                  </Typography>
                </Stack>
              )}
              {totals.tva0 !== undefined && totals.tva0 > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    TVA 0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {totals.tva0.toFixed(2)} €
                  </Typography>
                </Stack>
              )}
            </>
          )}

          <Divider />

          {/* Total TTC */}
          <Stack direction="row" justifyContent="space-between">
            <Typography
              variant="h6"
              color={highlighted ? 'primary' : 'text.primary'}
            >
              TOTAL TTC
            </Typography>
            <Typography
              variant="h6"
              color={highlighted ? 'primary' : 'text.primary'}
              fontWeight="bold"
            >
              {totals.totalTTC.toFixed(2)} €
            </Typography>
          </Stack>

          {/* Mention légale AE */}
          {isAutoEntrepreneur && totals.totalTVA === 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                TVA non applicable, art. 293 B du CGI
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
