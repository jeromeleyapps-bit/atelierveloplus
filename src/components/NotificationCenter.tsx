/**
 * Centre de Notifications
 * Affiche des alertes pour RDV, factures, tickets, stock
 */

"use client";

import { useEffect, useState, useCallback } from 'react';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EventIcon from '@mui/icons-material/Event';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { listInvoices, searchWorkOrders } from '@/lib/api';

interface Notification {
  id: string;
  type: 'rdv' | 'invoice' | 'ticket' | 'stock';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  link?: string;
}

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    const notifs: Notification[] = [];

    try {
      // 1. RDV dans les prochaines 24h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      try {
        const res = await fetch(`/api/calendar/bookings?start=${new Date().toISOString()}&end=${tomorrow.toISOString()}`);
        if (res.ok) {
          const bookings = await res.json();
          const upcoming = bookings.filter((b: { status: string }) => b.status !== 'cancelled');
          
          if (upcoming.length > 0) {
            notifs.push({
              id: 'rdv-upcoming',
              type: 'rdv',
              title: `${upcoming.length} RDV à venir`,
              message: `Vous avez ${upcoming.length} rendez-vous dans les prochaines 24h`,
              severity: 'info',
              link: '/admin/calendar'
            });
          }
        }
      } catch (_e) {
        // Ignorer silencieusement les erreurs d'auth
      }

      // 2. Factures en attente (issued)
      try {
        const invoices = await listInvoices({ status: 'issued' });
        
        if (invoices.length > 0) {
          const total = invoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
          notifs.push({
            id: 'invoices-pending',
            type: 'invoice',
            title: `${invoices.length} facture${invoices.length > 1 ? 's' : ''} en attente`,
            message: `Total: ${total.toFixed(2)} €`,
            severity: 'warning',
            link: '/finance?status=issued'
          });
        }
      } catch (_e) {
        // Ignorer silencieusement les erreurs
      }

      // 3. Tickets non démarrés (created)
      try {
        const tickets = await searchWorkOrders({ status: 'created' });
        
        if (tickets.length > 0) {
          notifs.push({
            id: 'tickets-pending',
            type: 'ticket',
            title: `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} en attente`,
            message: 'Tickets non démarrés',
            severity: 'info',
            link: '/tickets?status=created'
          });
        }
      } catch (_e) {
        // Ignorer silencieusement les erreurs
      }

      setNotifications(notifs);
    } catch (_e) {
      // Ignorer silencieusement
    }
  }, []);

  // Déclaré après loadNotifications : l'effet la référençait auparavant avant
  // sa déclaration.
  useEffect(() => {
    loadNotifications();
    // Recharger toutes les 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (link?: string) => {
    if (link) {
      window.location.href = link;
    }
    handleClose();
  };

  const open = Boolean(anchorEl);

  const getIcon = (type: string) => {
    switch (type) {
      case 'rdv':
        return <EventIcon color="info" />;
      case 'invoice':
        return <ReceiptIcon color="warning" />;
      case 'ticket':
        return <AssignmentIcon color="info" />;
      case 'stock':
        return <WarningIcon color="error" />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 360, maxHeight: 500 }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6">Notifications</Typography>
            <Typography variant="caption">
              {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </Typography>
          </Box>

          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aucune notification
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notif, index) => (
                <div key={notif.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notif.link)}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer'
                    }}
                  >
                    <ListItemIcon>
                      {getIcon(notif.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={notif.title}
                      secondary={notif.message}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={notif.severity}
                      size="small"
                      color={notif.severity === 'error' ? 'error' : notif.severity === 'warning' ? 'warning' : 'info'}
                      sx={{ ml: 1 }}
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
