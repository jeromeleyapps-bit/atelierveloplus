"use client";

import { Suspense, useState } from "react";
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ResponsiveContainer from "@/components/ResponsiveContainer";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useAuth } from "../AuthContext";
import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push(next as Route);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Échec de connexion";
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error('Login error', { error: errorMessage });
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveContainer maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h1" sx={{ mb: 2 }}>
        Connexion
      </Typography>
      <Paper sx={{ p: 2 }}>
        {user ? (
          <Stack spacing={2}>
            <Typography>Vous êtes connecté en tant que {user.email || user.id}</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => router.push("/account")}>
                Mon compte
              </Button>
              <Button variant="outlined" color="inherit" onClick={logout}>
                Se déconnecter
              </Button>
            </Stack>
          </Stack>
        ) : (
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField label="Mot de passe" type="password" size="small" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" disabled={submitting}>{submitting ? "Connexion..." : "Se connecter"}</Button>
              <Button href="/auth/register" variant="text">Créer un compte</Button>
            </Stack>
          </form>
        )}
      </Paper>
      <Snackbar
        open={!!error}
        autoHideDuration={3500}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ResponsiveContainer>
  );
}
