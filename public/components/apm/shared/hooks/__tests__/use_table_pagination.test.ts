/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useTablePagination } from '../use_table_pagination';
import { APM_CONSTANTS } from '../../../common/constants';

describe('useTablePagination', () => {
  it('returns initial state with defaults', () => {
    const { result } = renderHook(() => useTablePagination(25));

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: APM_CONSTANTS.DEFAULT_PAGE_SIZE,
      totalItemCount: 25,
      pageSizeOptions: [...APM_CONSTANTS.PAGE_SIZE_OPTIONS],
    });
  });

  it('accepts custom options', () => {
    const { result } = renderHook(() =>
      useTablePagination(100, { defaultPageSize: 25, pageSizeOptions: [25, 50, 100] })
    );

    expect(result.current.pagination.pageSize).toBe(25);
    expect(result.current.pagination.pageSizeOptions).toEqual([25, 50, 100]);
  });

  it('updates pageIndex and pageSize on table change', () => {
    const { result } = renderHook(() => useTablePagination(50));

    act(() => {
      result.current.onTableChange({ page: { index: 2, size: 10 } });
    });

    expect(result.current.pagination.pageIndex).toBe(2);
    expect(result.current.pagination.pageSize).toBe(10);
  });

  it('updates pageSize when page size changes', () => {
    const { result } = renderHook(() => useTablePagination(50));

    act(() => {
      result.current.onTableChange({ page: { index: 0, size: 25 } });
    });

    expect(result.current.pagination.pageSize).toBe(25);
    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('resets page index to 0', () => {
    const { result } = renderHook(() => useTablePagination(50));

    act(() => {
      result.current.onTableChange({ page: { index: 3, size: 10 } });
    });
    expect(result.current.pagination.pageIndex).toBe(3);

    act(() => {
      result.current.resetPage();
    });
    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('handles table change with sort only (no page)', () => {
    const { result } = renderHook(() => useTablePagination(50));

    act(() => {
      result.current.onTableChange({ page: { index: 2, size: 10 } });
    });
    expect(result.current.pagination.pageIndex).toBe(2);

    // Sort-only change should not affect pagination
    act(() => {
      result.current.onTableChange({ sort: { field: 'name', direction: 'asc' } });
    });
    expect(result.current.pagination.pageIndex).toBe(2);
  });

  it('reflects updated totalItemCount', () => {
    const { result, rerender } = renderHook(({ count }) => useTablePagination(count), {
      initialProps: { count: 50 },
    });

    expect(result.current.pagination.totalItemCount).toBe(50);

    rerender({ count: 30 });
    expect(result.current.pagination.totalItemCount).toBe(30);
  });

  it('provides stable callback references', () => {
    const { result, rerender } = renderHook(({ count }) => useTablePagination(count), {
      initialProps: { count: 50 },
    });

    const firstOnTableChange = result.current.onTableChange;
    const firstResetPage = result.current.resetPage;

    rerender({ count: 30 });

    expect(result.current.onTableChange).toBe(firstOnTableChange);
    expect(result.current.resetPage).toBe(firstResetPage);
  });
});
