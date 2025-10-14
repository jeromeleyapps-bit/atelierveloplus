"use client";

import {
  Card,
  CardHeader,
  CardContent,
  Avatar,
  IconButton,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

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

export default function CustomerCard({ customer, onEdit, elevation = 0 }: CustomerCardProps) {
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
}
