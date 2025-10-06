"use client";

import { Suspense, useMemo, useState } from "react";
import { Button, Checkbox, Container, FormControlLabel, Paper, Stack, TextField, Snackbar, Alert } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useAuth } from "../AuthContext";
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div />}> 
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shopName, setShopName] = useState("");
  const [isAuto, setIsAuto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passLenOk = password.length >= 10;
  const passClasses = useMemo(() => {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];
    return classes.reduce((acc, rx) => acc + (rx.test(password) ? 1 : 0), 0);
  }, [password]);
  const passClassOk = passClasses >= 3;
  const passMatchOk = confirm.length > 0 && password === confirm;
  const formOk = emailValid && passLenOk && passClassOk && passMatchOk && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) { setError("Email invalide"); return; }
    if (!passLenOk || !passClassOk) { setError("Mot de passe trop faible (min. 10 caractères et 3 types: minuscule, majuscule, chiffre, symbole)"); return; }
    if (!passMatchOk) { setError("Les mots de passe ne correspondent pas"); return; }
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        shopName: shopName || undefined,
        isAutoEntrepreneur: isAuto,
      });
      router.push(next as Route);
    } catch (e: unknown) {
      // Try to parse backend reason from error message like: "API 400: {\"error\":...,\"reason\":...}"
      let msg = "Échec de création du compte";
      if (e instanceof Error && e.message.startsWith("API ")) {
        const idx = e.message.indexOf("{\"error\"");
        if (idx !== -1) {
          try {
            const j = JSON.parse(e.message.slice(idx));
            if (j?.reason === 'weak_password') msg = "Mot de passe trop faible (min. 10 caractères et 3 types: minuscule, majuscule, chiffre, symbole)";
            else if (j?.reason === 'invalid_email') msg = "Email invalide";
            else if (j?.reason === 'breached_password') msg = "Mot de passe compromis (connu dans des fuites). Choisissez-en un autre.";
            else if (j?.reason === 'missing_fields') msg = "Champs requis manquants";
          } catch {}
        }
      }
      console.error(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <h1 style={{ margin: 0, marginBottom: 16, fontSize: "2rem", fontWeight: 500 }}>Créer un compte</h1>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Prénom" size="small" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <TextField label="Nom" size="small" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <TextField label="Nom de l'atelier / magasin" size="small" value={shopName} onChange={(e) => setShopName(e.target.value)} />
            <TextField label="Email" type="email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Mot de passe" type="password" size="small" value={password} onChange={(e) => setPassword(e.target.value)} required helperText="Au moins 10 caractères et 3 types parmi: minuscule, majuscule, chiffre, symbole" />
            <TextField label="Confirmer le mot de passe" type="password" size="small" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--mui-palette-text-secondary)' }}>
              <li style={{ color: passLenOk ? 'green' : undefined }}>Longueur ≥ 10</li>
              <li style={{ color: passClassOk ? 'green' : undefined }}>Contient ≥ 3 types (a-z, A-Z, 0-9, symbole)</li>
              <li style={{ color: passMatchOk ? 'green' : undefined }}>Confirmation identique</li>
            </ul>
            <FormControlLabel control={<Checkbox checked={isAuto} onChange={(e) => setIsAuto(e.target.checked)} />} label="Statut auto-entrepreneur" />
            <Button type="submit" variant="contained" disabled={!formOk}>{submitting ? "Création..." : "Créer le compte"}</Button>
            <Button href="/auth/login" variant="text">Déjà un compte ? Se connecter</Button>
          </Stack>
        </form>
      </Paper>
      <Snackbar open={!!error} autoHideDuration={3500} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
