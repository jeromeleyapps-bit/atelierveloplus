"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

interface Props {
  /** Libellé affiché au-dessus de la zone de signature. */
  label?: string;
  /** Demander le nom du signataire. */
  askName?: boolean;
  /** Appelé à la validation : image PNG (data URL) + nom optionnel. */
  onConfirm: (dataUrl: string, name: string) => void | Promise<void>;
  /** Texte du bouton de validation. */
  confirmLabel?: string;
  confirming?: boolean;
}

/**
 * Pad de signature tactile / souris / stylet, sans dépendance externe.
 * Capture la signature en image PNG (data URL base64).
 */
export default function SignaturePad({
  label = 'Signature du client',
  askName = true,
  onConfirm,
  confirmLabel = 'Valider la signature',
  confirming = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [name, setName] = useState('');

  // Initialise le canvas (fond blanc + trait net en haute résolution).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111111';
  }, []);

  const pos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasDrawn) setHasDrawn(true);
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  async function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    await onConfirm(dataUrl, name.trim());
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{label}</Typography>
      {askName && (
        <TextField
          label="Nom du signataire"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
        />
      )}
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: '#fff',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          style={{ width: '100%', height: 180, display: 'block', cursor: 'crosshair' }}
        />
      </Box>
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button onClick={clear} disabled={!hasDrawn || confirming}>Effacer</Button>
        <Button variant="contained" onClick={confirm} disabled={!hasDrawn || confirming}>
          {confirmLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
