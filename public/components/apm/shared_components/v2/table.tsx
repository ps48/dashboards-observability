/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
} from '@virajsanghvi/oui';

interface Column<T> {
  field?: keyof T;
  name: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  truncateText?: boolean;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface OuiTableProps<T> {
  items: T[];
  columns: Array<Column<T>>;
  sorting?: {
    sort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  onChange?: (criteria: { sort?: { field: string; direction: 'asc' | 'desc' } }) => void;
  tableLayout?: 'auto' | 'fixed';
}

/**
 * Native OUI 2.0 Table component with sorting support
 *
 * Replaces EuiBasicTable with clean OUI 2.0 implementation
 * Supports sorting, custom rendering, and responsive layout
 */
export function OuiTable<T extends Record<string, any>>({
  items,
  columns,
  sorting,
  onChange,
  tableLayout = 'auto',
}: OuiTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    sorting?.sort ? { field: sorting.sort.field, direction: sorting.sort.direction } : null
  );

  // Update sort config when external sorting changes
  useEffect(() => {
    if (sorting?.sort) {
      setSortConfig({ field: sorting.sort.field, direction: sorting.sort.direction });
    }
  }, [sorting?.sort]);

  const handleSort = (field: string) => {
    let newDirection: 'asc' | 'desc' = 'asc';

    if (sortConfig?.field === field) {
      newDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    const newSortConfig = { field, direction: newDirection };
    setSortConfig(newSortConfig);

    if (onChange) {
      onChange({ sort: newSortConfig });
    }
  };

  const sortedItems = React.useMemo(() => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isSorted = sortConfig?.field === field;
    const direction = isSorted ? sortConfig?.direction : null;

    return (
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="oui:h-auto oui:p-0 oui:font-semibold oui:text-sm oui:hover:bg-transparent oui:text-gray-700"
      >
        {children}
        <span className="oui:ml-2 oui:text-xs">
          {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
        </span>
      </Button>
    );
  };

  return (
    <Table className="oui:w-full oui:min-w-[800px] oui:table-auto oui:bg-white">
      <TableHeader>
        <TableRow className="oui:bg-gray-50">
          {columns.map((column, idx) => (
            <TableHead
              key={idx}
              style={{ width: column.width }}
              className="oui:text-left oui:bg-gray-50"
            >
              {column.field && column.sortable !== false ? (
                <SortButton field={String(column.field)}>{column.name}</SortButton>
              ) : (
                <span className="oui:font-semibold oui:text-sm oui:text-gray-700">
                  {column.name}
                </span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="oui:bg-white">
        {sortedItems.map((item, rowIdx) => (
          <TableRow key={rowIdx} className="oui:bg-white hover:oui:bg-gray-50">
            {columns.map((column, colIdx) => (
              <TableCell
                key={colIdx}
                style={{ width: column.width }}
                className={`oui:bg-white ${column.truncateText ? 'oui:truncate' : 'oui:whitespace-normal'}`}
              >
                {column.render
                  ? column.render(item)
                  : column.field
                  ? String(item[column.field] ?? '')
                  : ''}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
