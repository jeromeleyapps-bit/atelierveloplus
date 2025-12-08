"use client";

import { useEffect } from "react";
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from "next/navigation";

export default function AdminBookingPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/calendar");
  }, [router]);
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={20} />
        <Typography>Redirection vers le calendrier admin…</Typography>
      </Stack>
    </Box>
  );
}
