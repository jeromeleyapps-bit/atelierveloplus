"use client";

import { useEffect, useState } from "react";
import { Box, Grid, Skeleton } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import GroupIcon from "@mui/icons-material/Group";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";

export default function AdminPage() {
  // Start loading true to guarantee identical SSR/CSR first paint
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <RequireAuth>
      <PageShell title="Administration">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Utilisateurs" icon={<GroupIcon color="primary" />}>
              {loading ? (
                <>
                  <Skeleton height={24} width={220} />
                  <Skeleton height={16} width={360} />
                  <Skeleton height={16} width={320} />
                  <Skeleton height={16} width={300} />
                </>
              ) : (
                <Box color="text.secondary">
                  Gestion des utilisateurs (à implémenter)
                </Box>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Rôles & Permissions" icon={<SecurityIcon color="primary" />}>
              {loading ? (
                <>
                  <Skeleton height={24} width={260} />
                  <Skeleton height={16} width={340} />
                  <Skeleton height={16} width={280} />
                  <Skeleton height={16} width={310} />
                </>
              ) : (
                <Box color="text.secondary">
                  Définition des rôles et règles (à implémenter)
                </Box>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Paramètres de l'application" icon={<SettingsIcon color="primary" />}>
              {loading ? (
                <>
                  <Skeleton height={24} width={300} />
                  <Skeleton height={16} width={360} />
                  <Skeleton height={16} width={320} />
                </>
              ) : (
                <Box color="text.secondary">
                  Réglages généraux (à implémenter)
                </Box>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Intégrations" icon={<IntegrationInstructionsIcon color="primary" />}>
              {loading ? (
                <>
                  <Skeleton height={24} width={200} />
                  <Skeleton height={16} width={340} />
                  <Skeleton height={16} width={260} />
                </>
              ) : (
                <Box color="text.secondary">
                  Connexion aux services tiers (à implémenter)
                </Box>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      </PageShell>
    </RequireAuth>
  );
}
