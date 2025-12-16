/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFilters } from './use_filters';

describe('useFilters', () => {
  const initialFilters = {
    searchQuery: '',
    timeRange: { from: 'now-15m', to: 'now' },
  };

  it('should initialize with provided filters', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    act(() => {
      result.current.setSearchQuery('auth-service');
    });

    expect(result.current.filters.searchQuery).toBe('auth-service');
    expect(result.current.filters.timeRange).toEqual(initialFilters.timeRange);
  });

  it('should update time range', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    const newTimeRange = { from: 'now-1h', to: 'now' };

    act(() => {
      result.current.setTimeRange(newTimeRange);
    });

    expect(result.current.filters.timeRange).toEqual(newTimeRange);
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('should reset filters to initial state', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    // Update both filters
    act(() => {
      result.current.setSearchQuery('payment-service');
      result.current.setTimeRange({ from: 'now-1h', to: 'now' });
    });

    expect(result.current.filters.searchQuery).toBe('payment-service');

    // Reset
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should handle multiple search query updates', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    act(() => {
      result.current.setSearchQuery('auth');
    });
    expect(result.current.filters.searchQuery).toBe('auth');

    act(() => {
      result.current.setSearchQuery('payment');
    });
    expect(result.current.filters.searchQuery).toBe('payment');

    act(() => {
      result.current.setSearchQuery('');
    });
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('should handle multiple time range updates', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    act(() => {
      result.current.setTimeRange({ from: 'now-1h', to: 'now' });
    });
    expect(result.current.filters.timeRange).toEqual({ from: 'now-1h', to: 'now' });

    act(() => {
      result.current.setTimeRange({ from: 'now-1d', to: 'now' });
    });
    expect(result.current.filters.timeRange).toEqual({ from: 'now-1d', to: 'now' });
  });

  it('should maintain filter independence when updating', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.filters.searchQuery).toBe('test');
    expect(result.current.filters.timeRange).toEqual(initialFilters.timeRange);
  });

  it('should handle absolute time ranges', () => {
    const { result } = renderHook(() => useFilters(initialFilters));

    const absoluteTimeRange = {
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-01T23:59:59Z',
    };

    act(() => {
      result.current.setTimeRange(absoluteTimeRange);
    });

    expect(result.current.filters.timeRange).toEqual(absoluteTimeRange);
  });
});
