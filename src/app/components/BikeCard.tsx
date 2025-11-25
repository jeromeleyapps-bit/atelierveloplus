"use client";

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import EditIcon from '@mui/icons-material/Edit';

interface BikeCardProps {
  bike: {
    id?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    color?: string;
    type?: string;
  } | null;
  onEdit?: () => void;
  elevation?: number;
}

export default function BikeCard({ bike, onEdit, elevation = 0 }: BikeCardProps) {
  if (!bike) {
    return (
      <Card elevation={elevation} sx={{ border: 1, borderColor: 'divider' }}>
        <CardHeader
          avatar={<BikeIcon color="action" />}
          title="Vélo"
          subheader="Aucun vélo sélectionné"
        />
      </Card>
    );
  }

  const bikeName = [bike.brand, bike.model].filter(Boolean).join(' ') || 'Vélo';

  return (
    <Card elevation={elevation} sx={{ border: 1, borderColor: 'divider' }}>
      <CardHeader
        avatar={<BikeIcon color="primary" />}
        title="Vélo"
        action={
          onEdit && (
            <IconButton onClick={onEdit} size="small">
              <EditIcon />
            </IconButton>
          )
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {bikeName}
            </Typography>
            {bike.serialNumber && (
              <Typography variant="body2" color="text.secondary">
                N° série: {bike.serialNumber}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {bike.type && (
              <Chip
                label={bike.type}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {bike.color && (
              <Chip
                label={bike.color}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
