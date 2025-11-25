/**
 * Hook useBikeHistoryUI - Bike history UI state
 * 
 * Pattern: State Colocation
 * - Search query
 * - Selected bike
 * - Expanded interventions
 */

import { useState } from 'react';

export function useBikeHistoryUI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBike, setSelectedBike] = useState<string | null>(null);
  const [expandedInterventions, setExpandedInterventions] = useState<Set<string>>(new Set());

  const toggleIntervention = (id: string) => {
    setExpandedInterventions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedBike,
    setSelectedBike,
    expandedInterventions,
    toggleIntervention,
  };
}
