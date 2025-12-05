/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { ServiceTableItem } from './types';

interface ServicesTableProps {
  items: ServiceTableItem[];
  isLoading: boolean;
}

/**
 * Basic services table using EuiBasicTable
 * (Simplified version - no grouping functionality)
 */
export const ServicesTable: React.FC<ServicesTableProps> = ({ items, isLoading }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<keyof ServiceTableItem>('serviceName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const columns: Array<EuiBasicTableColumn<ServiceTableItem>> = [
    {
      field: 'serviceName',
      name: 'Service Name',
      sortable: true,
      width: '40%',
    },
    {
      field: 'environment',
      name: 'Environment',
      sortable: true,
      width: '30%',
    },
    {
      field: 'serviceId',
      name: 'Service ID',
      sortable: false,
      width: '30%',
      truncateText: true,
    },
  ];

  // Sort items
  const sortedItems = React.useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, sortField, sortDirection]);

  // Paginate items
  const pageOfItems = sortedItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: items.length,
    pageSizeOptions: [10, 20, 50, 100],
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ page, sort }: any) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }

    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  };

  return (
    <EuiBasicTable
      items={pageOfItems}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      onChange={onTableChange}
      loading={isLoading}
      noItemsMessage={isLoading ? 'Loading services...' : 'No services found'}
    />
  );
};
