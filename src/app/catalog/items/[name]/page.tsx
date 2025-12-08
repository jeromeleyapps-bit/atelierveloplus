"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { listCatalogItems, type CatalogItem } from "@/lib/api";
import { logger } from '@/lib/logger';

export default function CatalogItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemName = decodeURIComponent(params?.name as string || "");
  
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      try {
        const result = await listCatalogItems({ q: itemName });
        // Trouver l'item exact par nom
        const found = result.items.find(i => i.name === itemName);
        setItem(found || null);
      } catch (error) {
        logger.error("Erreur chargement item:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (itemName) {
      loadItem();
    }
  }, [itemName]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} />
      </Container>
    );
  }

  if (!item) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Article non trouvé
          </Typography>
          <Typography color="text.secondary" paragraph>
            L&apos;article &quot;{itemName}&quot; n&apos;existe pas dans votre catalogue.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/catalog")}
          >
            Retour au catalogue
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/catalog")}
        sx={{ mb: 2 }}
      >
        Retour
      </Button>
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {item.name}
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            <strong>Catégorie:</strong> {item.category}
          </Typography>
          {item.sku && (
            <Typography variant="body1" color="text.secondary" paragraph>
              <strong>SKU:</strong> {item.sku}
            </Typography>
          )}
          <Typography variant="body1" color="text.secondary" paragraph>
            <strong>Prix HT:</strong> {item.priceHT.toFixed(2)} €
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            <strong>Prix TTC:</strong> {item.priceTTC.toFixed(2)} €
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            <strong>Stock actuel:</strong> {item.stockQty}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            <strong>Stock minimum:</strong> {item.minStock}
          </Typography>
          {item.stockQty <= item.minStock && (
            <Typography variant="body1" color="error" fontWeight="bold">
              ⚠️ ALERTE: Stock bas!
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
