"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Box, Button, Paper, Typography, IconButton, Menu, MenuItem, Divider } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import Image from "next/image";
import { useAuth } from "../auth/AuthContext";
import { useThemeMode } from "../providers";

export default function NavBanner() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  // Visible links in the top banner (tabs)
  const linksMain: { href: Route; label: string }[] = [
    { href: "/dashboard" as Route, label: "Dashboard" },
    { href: "/customers" as Route, label: "Clients" },
    { href: "/tickets" as Route, label: "Tickets" },
    { href: "/catalog" as Route, label: "Catalogue" },
    { href: "/suppliers" as Route, label: "Fournisseurs" },
    { href: "/admin/booking" as Route, label: "Calendrier" },
    { href: "/booking" as Route, label: "RDV client" },
    { href: "/finance" as Route, label: "Factures" },
    { href: "/stats" as Route, label: "Statistiques" },
  ];
  // Extra links only shown in the dropdown menu
  const linksMenuExtra: { href: Route; label: string }[] = [
    { href: "/settings" as Route, label: "Paramètres" },
    { href: "/admin" as Route, label: "Admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
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
            <Image src="/logo.png" alt="Atelier velo +" width={28} height={28} priority style={{ borderRadius: 4 }} />
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Atelier velo +</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {user ? (
            <Button
              component={Link}
              href="/account"
              size="small"
              variant={isActive("/account") ? "contained" : "outlined"}
            >
              {user.shopName || 'Mon compte'}
            </Button>
          ) : null}
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
        {linksMain.map((l) => (
          <Button
            key={l.href}
            component={Link}
            href={l.href}
            size="small"
            variant="text"
            sx={{
              px: 1.25,
              borderRadius: 1,
              color: 'text.primary',
              opacity: isActive(l.href) ? 1 : 0.9,
              bgcolor: isActive(l.href) ? 'action.selected' : 'transparent',
              fontWeight: isActive(l.href) ? 600 : 500,
              '&:hover': { bgcolor: isActive(l.href) ? 'action.selected' : 'action.hover' },
            }}
          >
            {l.label}
          </Button>
        ))}
      </Box>
    </Paper>
  );
}
