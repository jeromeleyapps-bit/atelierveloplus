"use client";

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { logger } from '@/lib/logger';

interface Pkg { id: string; name: string; lines: { description: string }[] }

interface Props {
  workOrderId: string;
  onApplied?: () => void;
}

/** Bouton « Ajouter un forfait » : applique un forfait prédéfini au bon de travail. */
export default function ForfaitSelector({ workOrderId, onApplied }: Props) {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/service-packages')
      .then(r => r.json())
      .then(d => setPackages(d.packages || []))
      .catch(e => logger.error('[forfait-selector] load failed', e));
  }, []);

  async function apply(packageId: string) {
    setBusy(true);
    setAnchor(null);
    try {
      const res = await fetch(`/api/workorders/${workOrderId}/apply-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      if (res.ok) onApplied?.();
    } catch (e) {
      logger.error('[forfait-selector] apply failed', e);
    } finally {
      setBusy(false);
    }
  }

  if (packages.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Astuce : crée des <Link href="/admin/forfaits">forfaits</Link> pour ajouter main d&apos;œuvre + pièces en 1 clic.
      </Typography>
    );
  }

  return (
    <Stack direction="row" sx={{ mt: 1 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Inventory2Icon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={busy}
      >
        Ajouter un forfait
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {packages.map(p => (
          <MenuItem key={p.id} onClick={() => apply(p.id)}>
            {p.name} <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({p.lines.length} ligne{p.lines.length > 1 ? 's' : ''})</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
