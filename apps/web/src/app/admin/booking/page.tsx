"use client";

import { useEffect } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
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
