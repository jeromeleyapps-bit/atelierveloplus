import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkOrder, setWorkOrderType, type WorkOrderType } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Hook personnalisé pour le formulaire de création de ticket
 * Pattern: "Compound State" + TanStack Query mutations
 * 
 * Centralise:
 * - États du formulaire (customer, bike, type)
 * - Dialog open/close
 * - Mutation création
 * - Validation et reset
 */
export function useCreateTicketForm() {
  const queryClient = useQueryClient();
  
  // Dialog state
  const [open, setOpen] = useState(false);
  
  // Form states
  const [customerId, setCustomerId] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [ticketType, setTicketType] = useState<WorkOrderType | "">("");
  
  // Mutation création de ticket
  const createMutation = useMutation({
    mutationFn: async (data: { customerId: string; bikeId?: string; ticketType?: WorkOrderType }) => {
      // 1. Créer le work order
      const created = await createWorkOrder({
        customerId: data.customerId,
        bikeId: data.bikeId || undefined,
      });
      
      // 2. Si type spécifié, l'ajouter
      if (data.ticketType) {
        try {
          await setWorkOrderType(created.id, data.ticketType);
        } catch (e) {
          logger.warn('Failed to set work order type:', e);
        }
      }
      
      return created;
    },
    onSuccess: (created) => {
      // Invalider cache tickets
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      
      // Fermer dialog
      setOpen(false);
      
      // Reset form
      reset();
      
      // Rediriger vers page détail
      window.location.href = `/tickets/${created.id}`;
    },
    onError: (error) => {
      logger.error('Failed to create ticket:', error);
      // L'erreur sera gérée par le composant via mutation.isError
    },
  });
  
  // Helpers
  const reset = () => {
    setCustomerId("");
    setBikeId("");
    setTicketType("");
  };
  
  const openDialog = () => {
    reset(); // Reset form avant ouverture
    setOpen(true);
  };
  
  const closeDialog = () => {
    setOpen(false);
    // Ne pas reset immédiatement pour éviter le flash
    setTimeout(reset, 300); // Reset après animation fermeture
  };
  
  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Validation
    if (!customerId) {
      return { error: "Customer requis" };
    }
    
    // Soumettre
    createMutation.mutate({
      customerId,
      bikeId: bikeId || undefined,
      ticketType: ticketType || undefined,
    });
  };
  
  return {
    // Dialog
    open,
    setOpen,
    openDialog,
    closeDialog,
    
    // Form states
    customerId,
    setCustomerId,
    bikeId,
    setBikeId,
    ticketType,
    setTicketType,
    
    // Actions
    reset,
    handleSubmit,
    
    // Mutation state
    isCreating: createMutation.isPending,
    isError: createMutation.isError,
    error: createMutation.error,
  };
}

/**
 * Hook pour le formulaire d'ajout de vélo
 * Utilisé quand le customer n'a pas encore de vélo
 */
export function useAddBikeForm() {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  
  const reset = () => {
    setBrand("");
    setModel("");
    setSerialNumber("");
    setColor("");
    setNotes("");
  };
  
  const openDialog = () => {
    reset();
    setOpen(true);
  };
  
  const closeDialog = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };
  
  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    brand,
    setBrand,
    model,
    setModel,
    serialNumber,
    setSerialNumber,
    color,
    setColor,
    notes,
    setNotes,
    reset,
  };
}
