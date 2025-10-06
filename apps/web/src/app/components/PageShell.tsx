"use client";

import { Container } from "@mui/material";

export default function PageShell({
  title,
  children,
  maxWidth = "lg" as const,
}: {
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 4 }}>
      <h1
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: "2rem",
          fontWeight: 500,
        }}
      >
        {title}
      </h1>
      {children}
    </Container>
  );
}
