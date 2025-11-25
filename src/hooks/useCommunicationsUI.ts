/**
 * Hook useCommunicationsUI - Details dialog state
 * 
 * Pattern: State Colocation
 * - Dialog open/close
 * - Selected communication
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

interface Communication {
  id: string;
  event: string;
  recipient: string;
  status: string;
  sentAt: string;
  subject?: string | null;
  content?: string | null;
  error?: string | null;
  customer?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export function useCommunicationsUI() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

  const openDetails = (comm: Communication) => {
    setSelectedComm(comm);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedComm(null);
  };

  return {
    // Dialog state
    detailsOpen,
    setDetailsOpen,
    selectedComm,
    setSelectedComm,

    // Actions
    openDetails,
    closeDetails,
  };
}
