# 📅 Rendez-vous Retour Vélo - Spécification

## 🎯 Objectif

Permettre de définir un rendez-vous de retour lors de la création d'un ticket, qui bloque automatiquement un créneau dans le calendrier admin.

---

## 🏗️ Architecture

### **1. Schéma Prisma** ✅

```prisma
model WorkOrder {
  appointmentDate    DateTime?       // Date et heure du RDV retour
  calendarEventId    String?         // Lien vers l'événement calendrier
  calendarEvent      CalendarEvent?  @relation(fields: [calendarEventId], references: [id])
}

model CalendarEvent {
  workOrders  WorkOrder[] // Tickets liés à ce RDV
}
```

### **2. API Backend** (À créer)

**POST `/api/workorders/[id]/appointment`**
- Crée un événement calendrier
- Lie l'événement au ticket
- Bloque le créneau

**DELETE `/api/workorders/[id]/appointment`**
- Supprime l'événement calendrier
- Libère le créneau

**PUT `/api/workorders/[id]/appointment`**
- Modifie la date/heure du RDV
- Met à jour l'événement calendrier

### **3. Interface Utilisateur** (À créer)

**Page Ticket** :
- Champs date + heure du RDV
- Bouton "Définir RDV"
- Affichage du RDV actuel
- Bouton "Modifier/Annuler RDV"

---

## 🔄 Workflow

### **Création Ticket avec RDV**

```
1. Mécanicien crée un ticket
2. Remplit les infos (client, vélo, pièces)
3. Définit un RDV retour :
   - Date : 15/10/2025
   - Heure : 14:00
4. Sauvegarde

→ Système crée automatiquement :
  - Événement calendrier "Retour vélo - [Client]"
  - Start : 15/10/2025 14:00
  - End : 15/10/2025 14:30 (30min par défaut)
  - blocksAvail : true
  - Lien ticket ↔ événement
```

### **Modification RDV**

```
1. Ouvrir le ticket
2. Modifier la date/heure du RDV
3. Sauvegarder

→ Système met à jour l'événement calendrier
```

### **Annulation RDV**

```
1. Ouvrir le ticket
2. Cliquer "Annuler RDV"

→ Système supprime l'événement calendrier
→ Libère le créneau
```

---

## 📋 Migration Prisma

### **Commandes**

```powershell
cd apps/web
npx prisma migrate dev --name add_appointment_to_workorder
```

---

## 🎨 Interface Proposée

### **Formulaire Ticket**

```
┌─────────────────────────────────────────────┐
│ 🔧 Nouveau Ticket                           │
├─────────────────────────────────────────────┤
│                                             │
│ Client: [Sélectionner...]                   │
│ Vélo: [Sélectionner...]                     │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📅 Rendez-vous Retour                   │ │
│ ├─────────────────────────────────────────┤ │
│ │ Date: [15/10/2025]  Heure: [14:00]     │ │
│ │ Durée: [30 min] ▼                       │ │
│ │                                         │ │
│ │ ✅ Bloquer le créneau dans l'agenda    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Annuler]  [Créer le ticket]               │
└─────────────────────────────────────────────┘
```

### **Fiche Ticket Existant**

```
┌─────────────────────────────────────────────┐
│ Ticket #12345                               │
├─────────────────────────────────────────────┤
│                                             │
│ 📅 Rendez-vous Retour                       │
│ ┌─────────────────────────────────────────┐ │
│ │ 📆 15 octobre 2025 à 14:00             │ │
│ │ ⏱️  Durée: 30 minutes                   │ │
│ │ 📍 Créneau bloqué dans l'agenda        │ │
│ │                                         │ │
│ │ [✏️ Modifier]  [🗑️ Annuler]             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔧 Implémentation

### **Étape 1 : Migration Prisma** ✅

```powershell
npx prisma migrate dev --name add_appointment_to_workorder
```

### **Étape 2 : API Backend**

**Créer** : `apps/web/src/app/api/workorders/[id]/appointment/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST - Créer un RDV
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { appointmentDate, duration = 30 } = await req.json();
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: true, bike: true },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Calculer la fin du RDV
    const start = new Date(appointmentDate);
    const end = new Date(start.getTime() + duration * 60000);

    // Créer l'événement calendrier
    const event = await prisma.calendarEvent.create({
      data: {
        title: `Retour vélo - ${workOrder.customer?.name || "Client"}`,
        description: `Ticket #${workOrder.id.slice(-6)}${workOrder.bike ? ` - ${workOrder.bike.brand} ${workOrder.bike.model}` : ""}`,
        start,
        end,
        status: "planned",
        blocksAvail: true,
        color: "#4CAF50", // Vert pour retour vélo
      },
    });

    // Lier l'événement au ticket
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: start,
        calendarEventId: event.id,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// DELETE - Annuler un RDV
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder || !workOrder.calendarEventId) {
      return NextResponse.json({ error: "No appointment found" }, { status: 404 });
    }

    // Supprimer l'événement calendrier
    await prisma.calendarEvent.delete({
      where: { id: workOrder.calendarEventId },
    });

    // Mettre à jour le ticket
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: null,
        calendarEventId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete appointment" },
      { status: 500 }
    );
  }
}

// PUT - Modifier un RDV
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { appointmentDate, duration = 30 } = await req.json();
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder || !workOrder.calendarEventId) {
      return NextResponse.json({ error: "No appointment found" }, { status: 404 });
    }

    // Calculer la nouvelle fin
    const start = new Date(appointmentDate);
    const end = new Date(start.getTime() + duration * 60000);

    // Mettre à jour l'événement calendrier
    const event = await prisma.calendarEvent.update({
      where: { id: workOrder.calendarEventId },
      data: {
        start,
        end,
      },
    });

    // Mettre à jour le ticket
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: start,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update appointment" },
      { status: 500 }
    );
  }
}
```

### **Étape 3 : Interface React**

**Composant** : `AppointmentPicker.tsx`

```typescript
import { useState } from "react";
import { TextField, Button, Stack, Paper, Typography, IconButton } from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import EventIcon from "@mui/icons-material/Event";
import DeleteIcon from "@mui/icons-material/Delete";

interface AppointmentPickerProps {
  workOrderId: string;
  currentAppointment?: Date | null;
  onAppointmentSet: (date: Date) => void;
  onAppointmentCancel: () => void;
}

export function AppointmentPicker({
  workOrderId,
  currentAppointment,
  onAppointmentSet,
  onAppointmentCancel,
}: AppointmentPickerProps) {
  const [date, setDate] = useState<Date | null>(currentAppointment || null);
  const [time, setTime] = useState<Date | null>(currentAppointment || null);

  const handleSave = async () => {
    if (!date || !time) return;

    // Combiner date et heure
    const appointment = new Date(date);
    appointment.setHours(time.getHours(), time.getMinutes(), 0, 0);

    onAppointmentSet(appointment);
  };

  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          📅 Rendez-vous Retour
        </Typography>

        {currentAppointment ? (
          <Stack spacing={1}>
            <Typography variant="body2">
              📆 {new Date(currentAppointment).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<EventIcon />}>
                Modifier
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onAppointmentCancel}
              >
                Annuler
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{ textField: { size: 'small' } }}
            />
            <TimePicker
              label="Heure"
              value={time}
              onChange={setTime}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button
              variant="contained"
              startIcon={<EventIcon />}
              onClick={handleSave}
              disabled={!date || !time}
            >
              Définir le RDV
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
```

---

## 🎯 Avantages

### **Pour le Mécanicien** 🔧
- ✅ Définit le RDV en créant le ticket
- ✅ Pas besoin d'aller dans le calendrier
- ✅ Tout au même endroit

### **Pour l'Admin** 👑
- ✅ Créneau automatiquement bloqué
- ✅ Visibilité dans l'agenda
- ✅ Lien ticket ↔ RDV

### **Pour le Client** 👤
- ✅ RDV confirmé dès la création
- ✅ Peut recevoir un rappel (future)
- ✅ Créneau réservé

---

## 📊 Données Stockées

### **WorkOrder**
```typescript
{
  id: "cmg...",
  appointmentDate: "2025-10-15T14:00:00Z",
  calendarEventId: "cal_...",
}
```

### **CalendarEvent**
```typescript
{
  id: "cal_...",
  title: "Retour vélo - Jean Dupont",
  description: "Ticket #abc123 - Giant TCR",
  start: "2025-10-15T14:00:00Z",
  end: "2025-10-15T14:30:00Z",
  blocksAvail: true,
  color: "#4CAF50",
}
```

---

## ✅ Checklist Implémentation

- [x] Schéma Prisma modifié
- [ ] Migration appliquée
- [ ] API `/appointment` créée (POST, PUT, DELETE)
- [ ] Composant `AppointmentPicker` créé
- [ ] Intégration dans page ticket
- [ ] Tests fonctionnels
- [ ] Affichage dans calendrier admin

---

## 🚀 Prochaines Étapes

1. **Appliquer la migration** Prisma
2. **Créer l'API** `/appointment`
3. **Créer le composant** React
4. **Intégrer** dans la page ticket
5. **Tester** le workflow complet

**Prêt à commencer l'implémentation ?** 🎉
