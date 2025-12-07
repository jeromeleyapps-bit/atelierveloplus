"use client";

import { memo } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';

interface CustomerCardProps {
  customer: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
  } | null;
  onEdit?: () => void;
  elevation?: number;
}

/**
 * CustomerCard - Carte d'affichage client
 * Optimisé avec React.memo pour éviter les re-renders inutiles
 */
const CustomerCard = memo(function CustomerCard({ customer, onEdit, elevation = 0 }: CustomerCardProps) {
  if (!customer) {
    return (
      <Card elevation={elevation} sx={{ border: 1, borderColor: 'divider' }}>
        <CardHeader
          avatar={<PersonIcon color="action" />}
          title="Client"
          subheader="Aucun client sélectionné"
        />
      </Card>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Client';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card elevation={elevation} sx={{ border: 1, borderColor: 'divider' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {initials}
          </Avatar>
        }
        title="Client"
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
              {fullName}
            </Typography>
          </Box>

          {customer.email && (
            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {customer.email}
              </Typography>
            </Box>
          )}

          {customer.phone && (
            <Box display="flex" alignItems="center" gap={1}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {customer.phone}
              </Typography>
            </Box>
          )}

          {(customer.address1 || customer.city) && (
            <Box display="flex" alignItems="flex-start" gap={1}>
              <LocationOnIcon fontSize="small" color="action" sx={{ mt: 0.3 }} />
              <Box>
                {customer.address1 && (
                  <Typography variant="body2" color="text.secondary">
                    {customer.address1}
                  </Typography>
                )}
                {customer.address2 && (
                  <Typography variant="body2" color="text.secondary">
                    {customer.address2}
                  </Typography>
                )}
                {(customer.zip || customer.city) && (
                  <Typography variant="body2" color="text.secondary">
                    {[customer.zip, customer.city].filter(Boolean).join(' ')}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
});

export default CustomerCard;
