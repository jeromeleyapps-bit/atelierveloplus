"use client";

import { AppBar, Toolbar, Button, Typography, Box, IconButton, Tooltip } from "@mui/material";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeMode } from "../providers";
import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/api";

interface NavItem {
  text: string;
  path: Route;
}

const NavBar = () => {
  const pathname = usePathname();
  const { mode, toggleTheme } = useThemeMode();
  const [shopName, setShopName] = useState("Atelier Vélo+");

  useEffect(() => {
    // Charger le nom initial
    getAppSettings().then((settings) => {
      if (settings.shopName) {
        setShopName(settings.shopName);
      }
    }).catch(() => {});
    
    // Écouter les mises à jour du nom
    const handleShopNameUpdate = (event: any) => {
      if (event.detail?.shopName) {
        setShopName(event.detail.shopName);
      }
    };
    
    window.addEventListener('shopNameUpdated', handleShopNameUpdate);
    return () => window.removeEventListener('shopNameUpdated', handleShopNameUpdate);
  }, []);

  const navItems: NavItem[] = [
    { text: "Tableau de bord", path: "/dashboard" as Route },
    { text: "Clients", path: "/customers" as Route },
    { text: "Tickets", path: "/tickets" as Route },
    { text: "Facturation", path: "/finance" as Route },
    { text: "Catalogue", path: "/catalog" as Route },
    { text: "Calendrier", path: "/calendar" as Route },
    { text: "Caisse", path: "/cash-register" as Route },
    { text: "Statistiques", path: "/stats" as Route },
  ];

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Link href={"/" as Route} passHref style={{ color: "inherit", textDecoration: "none", display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ height: 28, width: 'auto', marginRight: 8 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {shopName}
            </Typography>
          </Link>
        </Box>
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1, alignItems: "center" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} passHref legacyBehavior>
                <Button
                  component="a"
                  color={isActive ? "secondary" : "inherit"}
                  variant={isActive ? "outlined" : "text"}
                  sx={{
                    color: "inherit",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  {item.text}
                </Button>
              </Link>
            );
          })}
          <Tooltip title={mode === 'light' ? 'Mode sombre' : 'Mode clair'}>
            <IconButton 
              onClick={toggleTheme} 
              color="inherit"
              sx={{ ml: 1 }}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
