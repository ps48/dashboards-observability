/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { APM_CONSTANTS } from '../../common/constants';

interface UseTablePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

interface TablePagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}

interface TableChangeEvent {
  page?: { index: number; size: number };
  sort?: { field: string; direction: string };
}

/**
 * Hook for controlled table pagination with a workaround for broken page-number clicks.
 *
 * Root cause: In EUI's pagination, page numbers render as <a> elements inside <li> elements.
 * A React re-render during mousedown (triggered by focus events processed via React 18's
 * flushSync) destroys and re-creates the <li> DOM nodes. Because the mousedown target is
 * removed from the DOM before mouseup, the browser cannot synthesize a click event.
 * Arrow buttons work because they are direct children of <nav>, not inside <li>.
 *
 * Fix: A native mousedown listener on the table container intercepts page-number clicks
 * before the DOM mutation occurs, extracts the target page from data-test-subj, and
 * updates the controlled pageIndex state directly.
 *
 * Usage:
 *   const { pagination, onTableChange, resetPage, tableRef } = useTablePagination(items.length);
 *   <div ref={tableRef}>
 *     <EuiInMemoryTable items={items} pagination={pagination} onChange={onTableChange} />
 *   </div>
 */
export const useTablePagination = (totalItemCount: number, options?: UseTablePaginationOptions) => {
  const defaultPageSize = options?.defaultPageSize ?? APM_CONSTANTS.DEFAULT_PAGE_SIZE;
  const pageSizeOptions = options?.pageSizeOptions ?? [...APM_CONSTANTS.PAGE_SIZE_OPTIONS];

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const tableRef = useRef<HTMLDivElement>(null);

  const onTableChange = useCallback(({ page }: TableChangeEvent) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const resetPage = useCallback(() => {
    setPageIndex(0);
  }, []);

  // Workaround: intercept mousedown on pagination page-number buttons and update
  // pageIndex before the React re-render destroys the <li> DOM nodes.
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Match page-number buttons: data-test-subj="pagination-button-0", "pagination-button-1", etc.
      // Exclude arrow buttons: "pagination-button-previous", "pagination-button-next"
      const paginationButton = target.closest<HTMLElement>(
        'a[data-test-subj^="pagination-button-"]'
      );
      if (!paginationButton) return;

      const testSubj = paginationButton.getAttribute('data-test-subj') || '';
      const match = testSubj.match(/^pagination-button-(\d+)$/);
      if (!match) return;

      const targetPage = parseInt(match[1], 10);
      if (!isNaN(targetPage)) {
        // Use flushSync to force React to render the new pageIndex synchronously.
        // Without this, the state update is batched and EuiInMemoryTable's
        // getDerivedStateFromProps sees the old pageIndex value.
        flushSync(() => {
          setPageIndex(targetPage);
        });
        // Prevent the <a> from navigating via its href="#__table_xxx"
        e.preventDefault();
      }
    };

    el.addEventListener('mousedown', handler, true);
    return () => el.removeEventListener('mousedown', handler, true);
  }, []);

  const pagination: TablePagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions,
  };

  return { pagination, onTableChange, resetPage, tableRef };
};
