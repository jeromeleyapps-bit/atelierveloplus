/**
 * Hook useBikeSearch - Bike search with debounce
 * 
 * Pattern: Search query (not auto-fetching, manual trigger)
 * Simple state-based search, not useQuery (search is user-triggered)
 */

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface Bike {
  id: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  color?: string | null;
}

interface CustomerWithBikes {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  bikes: Bike[];
}

interface AutocompleteOption {
  label: string;
  value: CustomerWithBikes;
}

export function useBikeSearch() {
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CustomerWithBikes[]>([]);
  const [autocompleteOptions, setAutocompleteOptions] = useState<AutocompleteOption[]>([]);
  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);

  async function handleSearch(query: string) {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/bikes/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.customers || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Search error:', { error: errorMessage });
    } finally {
      setSearching(false);
    }
  }

  async function handleAutocompleteSearch(query: string) {
    if (!query || query.trim().length < 2) {
      setAutocompleteOptions([]);
      return;
    }

    setLoadingAutocomplete(true);
    try {
      const res = await fetch(`/api/bikes/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const options = (data.customers || []).map((c: CustomerWithBikes) => ({
        label: `${c.firstName || ''} ${c.lastName || ''}${c.email ? ` (${c.email})` : ''}`.trim(),
        value: c,
      }));
      setAutocompleteOptions(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Autocomplete error:', { error: errorMessage });
    } finally {
      setLoadingAutocomplete(false);
    }
  }

  return {
    searching,
    searchResults,
    setSearchResults,
    autocompleteOptions,
    setAutocompleteOptions,
    loadingAutocomplete,
    handleSearch,
    handleAutocompleteSearch,
  };
}
