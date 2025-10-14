# Plan: Redesign Interfaces Tickets/Devis/Factures

**Date**: 15 octobre 2025  
**Objectif**: Interfaces modernes, professionnelles et cohérentes

---

## 🎨 Vision Design

### Principes
- **Moderne**: Cards, shadows, spacing généreux
- **Professionnel**: Hiérarchie visuelle claire
- **Cohérent**: Même style sur les 3 pages
- **Efficace**: Actions rapides, moins de clics

### Palette de Couleurs
```
Primary: #2563eb (Bleu)
Success: #10b981 (Vert)
Warning: #f59e0b (Orange)
Error: #ef4444 (Rouge)
Gray: #6b7280 (Texte secondaire)
Background: #f9fafb (Fond)
```

---

## 📋 Structure Commune

### Layout en 2 Colonnes

```
┌─────────────────────────────────────────────────────────┐
│ [← Retour]                    [Actions principales →]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐│
│  │                      │  │                          ││
│  │   COLONNE GAUCHE     │  │   COLONNE DROITE         ││
│  │   (Informations)     │  │   (Actions & Résumé)     ││
│  │                      │  │                          ││
│  │  • Client            │  │  • Statut                ││
│  │  • Vélo              │  │  • Totaux                ││
│  │  • Description       │  │  • Actions rapides       ││
│  │                      │  │                          ││
│  └──────────────────────┘  └──────────────────────────┘│
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │   PRESTATIONS ET PIÈCES                            │ │
│  │   (Tableau avec sélecteur)                         │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Page Ticket (Modernisée)

### Header
```tsx
<Box sx={{ 
  bgcolor: 'background.paper', 
  borderBottom: 1, 
  borderColor: 'divider',
  px: 3,
  py: 2,
  mb: 3
}}>
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Box>
      <Typography variant="h4" fontWeight="bold">
        Ticket #{workOrder.id.slice(-8)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Créé le {formatDate(workOrder.createdAt)}
      </Typography>
    </Box>
    <Stack direction="row" spacing={2}>
      <Chip 
        label={workOrder.status} 
        color={getStatusColor(workOrder.status)}
        size="large"
      />
      <Button variant="outlined" startIcon={<ArrowBackIcon />}>
        Retour
      </Button>
    </Stack>
  </Stack>
</Box>
```

### Grid Layout
```tsx
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Grid container spacing={3}>
    {/* Colonne Gauche - 8/12 */}
    <Grid item xs={12} md={8}>
      {/* Informations Client */}
      <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
        <CardHeader 
          avatar={<PersonIcon />}
          title="Client"
          action={<IconButton><EditIcon /></IconButton>}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">
                {customer.firstName} {customer.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {customer.email} • {customer.phone}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Vélo */}
      <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
        <CardHeader 
          avatar={<DirectionsBikeIcon />}
          title="Vélo"
        />
        <CardContent>
          <Typography variant="body1">
            {bike.brand} {bike.model}
          </Typography>
        </CardContent>
      </Card>

      {/* Prestations et Pièces */}
      <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
        <CardHeader 
          title="Prestations et Pièces"
          action={
            <LineItemSelector 
              onAddLine={handleAddLine}
              bikeType={bike?.type}
              isAutoEntrepreneur={isAutoEntrepreneur}
            />
          }
        />
        <CardContent>
          <LineItemsTable
            lines={lines}
            onUpdateLine={handleUpdateLine}
            onDeleteLine={handleDeleteLine}
            isAutoEntrepreneur={isAutoEntrepreneur}
          />
        </CardContent>
      </Card>
    </Grid>

    {/* Colonne Droite - 4/12 */}
    <Grid item xs={12} md={4}>
      {/* Statut & Actions */}
      <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
        <CardHeader title="Statut" />
        <CardContent>
          <Stack spacing={2}>
            <Select value={status} onChange={handleStatusChange} fullWidth>
              <MenuItem value="pending">En attente</MenuItem>
              <MenuItem value="in_progress">En cours</MenuItem>
              <MenuItem value="completed">Terminé</MenuItem>
            </Select>
            
            <Divider />
            
            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<DescriptionIcon />}
            >
              Générer Devis
            </Button>
            <Button 
              variant="outlined" 
              fullWidth 
              startIcon={<ReceiptIcon />}
            >
              Créer Facture
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Résumé Financier */}
      <Card 
        elevation={0} 
        sx={{ 
          mb: 3, 
          border: 2, 
          borderColor: 'primary.main',
          bgcolor: 'primary.50'
        }}
      >
        <CardHeader 
          title="Résumé Financier"
          titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
        />
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Sous-total HT</Typography>
              <Typography variant="body2" fontWeight="medium">
                {totals.totalHT.toFixed(2)} €
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                TVA 10% (MO)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totals.tva10.toFixed(2)} €
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                TVA 20% (Pièces)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totals.tva20.toFixed(2)} €
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6" color="primary">
                TOTAL TTC
              </Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {totals.totalTTC.toFixed(2)} €
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <CardHeader title="Historique" />
        <CardContent>
          <Timeline>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot color="primary" />
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2">Ticket créé</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(workOrder.createdAt)}
                </Typography>
              </TimelineContent>
            </TimelineItem>
          </Timeline>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</Container>
```

---

## 📄 Page Devis (Nouvelle)

### Route: `/quotes/new`

```tsx
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
    <Typography variant="h4" gutterBottom fontWeight="bold">
      Nouveau Devis
    </Typography>
    
    <Stepper activeStep={activeStep} sx={{ my: 4 }}>
      <Step>
        <StepLabel>Client & Vélo</StepLabel>
      </Step>
      <Step>
        <StepLabel>Prestations & Pièces</StepLabel>
      </Step>
      <Step>
        <StepLabel>Validation</StepLabel>
      </Step>
    </Stepper>

    {activeStep === 0 && (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={customers}
            renderInput={(params) => (
              <TextField {...params} label="Client" />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={bikes}
            renderInput={(params) => (
              <TextField {...params} label="Vélo" />
            )}
          />
        </Grid>
      </Grid>
    )}

    {activeStep === 1 && (
      <Box>
        <LineItemSelector onAddLine={handleAddLine} />
        <LineItemsTable lines={lines} />
      </Box>
    )}

    {activeStep === 2 && (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          Vérifiez les informations avant de générer le devis
        </Alert>
        <LineItemsTable lines={lines} readOnly />
      </Box>
    )}

    <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
      <Button 
        disabled={activeStep === 0}
        onClick={handleBack}
      >
        Précédent
      </Button>
      <Box sx={{ flex: 1 }} />
      {activeStep === 2 ? (
        <Button 
          variant="contained" 
          size="large"
          onClick={handleGenerateQuote}
        >
          Générer le Devis
        </Button>
      ) : (
        <Button 
          variant="contained"
          onClick={handleNext}
        >
          Suivant
        </Button>
      )}
    </Stack>
  </Paper>
</Container>
```

---

## 🧾 Page Facture (Modernisée)

### Route: `/finance/invoices/new`

```tsx
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Stack direction="row" spacing={3}>
    {/* Formulaire Principal */}
    <Box sx={{ flex: 1 }}>
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <CardHeader 
          title="Nouvelle Facture"
          subheader="Remplissez les informations ci-dessous"
        />
        <CardContent>
          <Stack spacing={3}>
            {/* Client */}
            <Autocomplete
              options={customers}
              renderInput={(params) => (
                <TextField {...params} label="Client" required />
              )}
            />

            {/* Ticket source (optionnel) */}
            <Autocomplete
              options={workOrders}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Ticket source (optionnel)" 
                  helperText="Importer depuis un ticket existant"
                />
              )}
            />

            <Divider />

            {/* Lignes */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Lignes de facturation</Typography>
                <LineItemSelector onAddLine={handleAddLine} />
              </Stack>
              <LineItemsTable lines={lines} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>

    {/* Sidebar Résumé */}
    <Box sx={{ width: 350 }}>
      <Card 
        elevation={0} 
        sx={{ 
          position: 'sticky', 
          top: 20,
          border: 2,
          borderColor: 'primary.main'
        }}
      >
        <CardHeader 
          title="Résumé"
          titleTypographyProps={{ fontWeight: 'bold' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Client
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedCustomer?.name || '-'}
              </Typography>
            </Box>

            <Divider />

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Sous-total HT</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {totals.totalHT.toFixed(2)} €
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  TVA
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totals.totalTVA.toFixed(2)} €
                </Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h6">TOTAL TTC</Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {totals.totalTTC.toFixed(2)} €
                </Typography>
              </Stack>
            </Stack>

            <Button 
              variant="contained" 
              size="large" 
              fullWidth
              disabled={!canCreate}
            >
              Créer la Facture
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  </Stack>
</Container>
```

---

## 🎨 Composants Communs à Créer

### 1. CustomerCard
```tsx
<Card>
  <CardHeader 
    avatar={<Avatar>{customer.firstName[0]}</Avatar>}
    title={`${customer.firstName} ${customer.lastName}`}
    subheader={customer.email}
    action={<IconButton><EditIcon /></IconButton>}
  />
  <CardContent>
    <Stack spacing={1}>
      <Box display="flex" alignItems="center" gap={1}>
        <PhoneIcon fontSize="small" color="action" />
        <Typography variant="body2">{customer.phone}</Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        <LocationOnIcon fontSize="small" color="action" />
        <Typography variant="body2">
          {customer.address1}, {customer.city}
        </Typography>
      </Box>
    </Stack>
  </CardContent>
</Card>
```

### 2. BikeCard
```tsx
<Card>
  <CardHeader 
    avatar={<DirectionsBikeIcon />}
    title={`${bike.brand} ${bike.model}`}
    subheader={bike.serialNumber}
  />
  <CardContent>
    <Stack direction="row" spacing={1}>
      <Chip label={bike.type} size="small" />
      <Chip label={bike.color} size="small" variant="outlined" />
    </Stack>
  </CardContent>
</Card>
```

### 3. FinancialSummaryCard
```tsx
<Card sx={{ border: 2, borderColor: 'primary.main', bgcolor: 'primary.50' }}>
  <CardHeader title="Résumé Financier" />
  <CardContent>
    {/* Totaux */}
  </CardContent>
</Card>
```

---

## 📱 Responsive

### Mobile (< 768px)
- Layout en 1 colonne
- Sidebar en bas
- Actions en bottom sheet

### Tablet (768px - 1024px)
- Layout en 2 colonnes
- Sidebar réduite

### Desktop (> 1024px)
- Layout complet
- Sidebar fixe

---

## 🚀 Implémentation

### Phase 1: Composants Communs
- [ ] CustomerCard
- [ ] BikeCard
- [ ] FinancialSummaryCard
- [ ] StatusChip

### Phase 2: Page Ticket
- [ ] Nouveau layout Grid
- [ ] Header modernisé
- [ ] Sidebar résumé
- [ ] Intégration LineItems

### Phase 3: Page Devis
- [ ] Créer route `/quotes/new`
- [ ] Stepper workflow
- [ ] Intégration LineItems

### Phase 4: Page Facture
- [ ] Moderniser layout
- [ ] Sidebar sticky
- [ ] Intégration LineItems

---

**Prêt à implémenter le redesign ?** 🎨

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
