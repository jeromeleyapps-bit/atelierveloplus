"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import Image from "next/image";
import { useAuth } from "../auth/AuthContext";
import { useThemeMode } from "../providers";
import { getAppSettings } from "@/lib/api";
import NotificationCenter from "@/components/NotificationCenter";
import { logger } from '@/lib/logger';

interface ShopNameUpdateEvent extends Event {
  detail?: {
    shopName?: string;
    shopLogo?: string | null;
  };
}

export default function NavBanner() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [shopName, setShopName] = React.useState("Atelier velo +");
  const [shopLogo, setShopLogo] = React.useState<string | null>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  // Charger paramètres initiaux
  React.useEffect(() => {
    // 1. Charger depuis localStorage (immédiat - persiste après déconnexion)
    const storedName = localStorage.getItem('auth:shopName');
    const storedLogo = localStorage.getItem('auth:shopLogo');
    if (storedName) setShopName(storedName);
    if (storedLogo) setShopLogo(storedLogo);
    
    // 2. Sync avec API (au cas où localStorage désynchronisé)
    getAppSettings().then((settings) => {
      if (settings.shopName) {
        setShopName(settings.shopName);
        localStorage.setItem('auth:shopName', settings.shopName);
      }
      if (settings.shopLogo) {
        setShopLogo(settings.shopLogo);
        localStorage.setItem('auth:shopLogo', settings.shopLogo);
      }
    }).catch(() => {});
  }, []);
  
  // Écouter mises à jour (séparé pour éviter re-fetch au mount)
  React.useEffect(() => {
    const handleShopNameUpdate = (event: Event) => {
      const customEvent = event as ShopNameUpdateEvent;
      logger.info('[NavBanner] Event shopNameUpdated reçu:', customEvent.detail);
      if (customEvent.detail?.shopName) {
        setShopName(customEvent.detail.shopName);
      }
      if (customEvent.detail?.shopLogo !== undefined) {
        setShopLogo(customEvent.detail.shopLogo);
        logger.info('[NavBanner] Logo mis à jour:', customEvent.detail.shopLogo);
      }
    };
    
    window.addEventListener('shopNameUpdated', handleShopNameUpdate);
    return () => window.removeEventListener('shopNameUpdated', handleShopNameUpdate);
  }, []);

  // Visible links in the top banner (tabs)
  const linksMain: { href: Route; label: string }[] = [
    { href: "/dashboard" as Route, label: "Tableau de bord" },
    { href: "/customers" as Route, label: "Clients" },
    { href: "/tickets" as Route, label: "Réparations" },
    { href: "/finance" as Route, label: "Facturation" },
    { href: "/admin/booking" as Route, label: "Calendrier atelier" },
    { href: "/booking" as Route, label: "RDV client" },
    { href: "/bikes/history" as Route, label: "Historique Vélos" },
    { href: "/catalog" as Route, label: "Catalogue" },
    { href: "/cash-register" as Route, label: "Caisse" },
    { href: "/stats" as Route, label: "Statistiques" },
  ];
  // Extra links only shown in the dropdown menu
  const linksMenuExtra: { href: Route; label: string }[] = [
    { href: "/account" as Route, label: "Mon compte" },
    { href: "/catalog/services" as Route, label: "Tarifs & Prestations" },
    { href: "/admin" as Route, label: "Admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  // Couleurs thématiques par page - Palette bleus/verts/marrons
  const pageColors: Record<string, string> = {
    '/dashboard': '#3b82f6',      // Bleu vif
    '/customers': '#0ea5e9',      // Bleu cyan
    '/tickets': '#06b6d4',        // Cyan
    '/finance': '#10b981',        // Vert émeraude
    '/catalog': '#8b7355',        // Marron clair
    '/admin/booking': '#14b8a6',  // Turquoise
    '/booking': '#059669',        // Vert foncé
    '/bikes/history': '#0284c7',  // Bleu ciel
    '/suppliers': '#6366f1',      // Indigo
    '/cash-register': '#0d9488',  // Teal
    '/stats': '#2563eb',          // Bleu royal
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Ligne 1: logo + nom + actions */}
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Button component={Link} href="/" sx={{ p: 0, minWidth: 0 }} title="Accueil">
            {shopLogo ? (
              <Image 
                key={shopLogo}
                src={shopLogo.startsWith('/uploads/') ? `/api${shopLogo}` : shopLogo}
                alt="Logo atelier" 
                width={48} 
                height={48} 
                priority 
                unoptimized
                style={{ borderRadius: 4 }}
                onError={(e) => {
                  // Fallback si logo ne charge pas
                  logger.error('[NavBanner] Logo load error:', shopLogo);
                  e.currentTarget.style.display = 'none';
                  setShopLogo(null);
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center', lineHeight: 1.2 }}>
                  votre<br />logo
                </Typography>
              </Box>
            )}
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{shopName}</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {user ? (
            <Button
              component={Link}
              href="/account"
              size="small"
              variant={isActive("/account") ? "contained" : "outlined"}
            >
              Mon compte
            </Button>
          ) : null}
          <NotificationCenter />
          <Tooltip title="Mode d'Emploi" arrow>
            <IconButton 
              component={Link}
              href="/admin/guide"
              aria-label="aide"
              size="small"
              sx={{ 
                border: '2px solid',
                borderColor: '#1976d2',
                '&:hover': { 
                  bgcolor: 'primary.light',
                  borderColor: 'primary.dark'
                }
              }}
            >
              <MenuBookIcon color="primary" />
            </IconButton>
          </Tooltip>
          <IconButton 
            aria-label="toggle theme" 
            onClick={toggleTheme} 
            size="small"
            title={mode === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <IconButton aria-label="menu" onClick={openMenu} size="small">
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            {[...linksMain, ...linksMenuExtra].map((l) => (
              <MenuItem key={l.href} onClick={() => { closeMenu(); router.push(l.href); }} selected={isActive(l.href)}>
                {l.label}
              </MenuItem>
            ))}
            <Divider />
            {user ? (
              <MenuItem onClick={() => { closeMenu(); logout(); }}>Déconnexion</MenuItem>
            ) : (
              <MenuItem onClick={() => { closeMenu(); router.push('/auth/login'); }}>Se connecter</MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Ligne 2: liens de navigation */}
      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
        {linksMain.map((l) => {
          const themeColor = pageColors[l.href] || '#64B5F6';
          const active = isActive(l.href);
          return (
            <Box key={l.href} sx={{ position: 'relative', display: 'inline-block' }}>
              <Button
                component={Link}
                href={l.href}
                size="small"
                variant={active ? "contained" : "text"}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px 6px 0 0',
                  color: active ? 'white' : 'text.primary',
                  bgcolor: active ? themeColor : 'transparent',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                  fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
                  letterSpacing: '0.02em',
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: active ? themeColor : 'action.hover',
                    transform: active ? 'none' : 'translateY(-2px)',
                  },
                }}
              >
                {l.label}
              </Button>
              {active && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: '3px',
                    bgcolor: themeColor,
                    borderRadius: '2px',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
