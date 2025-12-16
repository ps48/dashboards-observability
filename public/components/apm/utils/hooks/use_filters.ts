/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { TimeRange } from '../../services/types';

export interface FilterState {
  searchQuery: string;
  timeRange: TimeRange;
}

export interface UseFiltersResult {
  filters: FilterState;
  setSearchQuery: (query: string) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  resetFilters: () => void;
}

/**
 * Hook for managing filter state across APM pages
 *
 * Provides centralized state management for search queries
 * and time ranges with reset functionality.
 *
 * @example
 * const { filters, setSearchQuery, setTimeRange, resetFilters } = useFilters({
 *   searchQuery: '',
 *   timeRange: { from: 'now-15m', to: 'now' },
 * });
 */
export const useFilters = (initialFilters: FilterState): UseFiltersResult => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setFilters((prev) => ({
      ...prev,
      timeRange,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    setSearchQuery,
    setTimeRange,
    resetFilters,
  };
};
