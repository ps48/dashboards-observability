/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableProps } from '@elastic/eui';
import { OUI2Wrapper } from './oui2_wrapper';

/**
 * OUI 2.0 styled wrapper for EuiBasicTable
 *
 * Provides EuiBasicTable functionality (sorting, pagination, selection, actions)
 * with OUI 2.0 Tailwind styling applied via CSS overrides
 *
 * Usage:
 * <BasicTable
 *   items={items}
 *   columns={columns}
 *   pagination={pagination}
 *   sorting={sorting}
 *   onChange={onChange}
 * />
 */
export function BasicTable<T extends object>(props: EuiBasicTableProps<T>) {
  return (
    <OUI2Wrapper>
      <div className="oui-basic-table-wrapper">
        <style>{`
          /* OUI 2.0 Table Styling */
          .oui-basic-table-wrapper {
            width: 100%;
            overflow-x: auto;
          }

          .oui-basic-table-wrapper .euiTable {
            background: transparent;
            border: none;
            width: 100%;
            min-width: 500px;
          }

          /* Table header styling */
          .oui-basic-table-wrapper .euiTableHeaderCell {
            border-bottom: 2px solid rgb(229, 231, 235);
            font-weight: 600;
            font-size: 0.875rem;
            color: rgb(55, 65, 81);
            padding: 0.75rem 1rem;
            background: rgb(249, 250, 251);
          }

          /* Table row styling */
          .oui-basic-table-wrapper .euiTableRow {
            border-bottom: 1px solid rgb(229, 231, 235);
          }

          .oui-basic-table-wrapper .euiTableRow:hover {
            background-color: rgb(249, 250, 251);
          }

          /* Table cell styling */
          .oui-basic-table-wrapper .euiTableRowCell {
            padding: 0.75rem 1rem;
            color: rgb(31, 41, 55);
            font-size: 0.875rem;
          }

          .oui-basic-table-wrapper .euiTableHeaderCell {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* Remove EUI borders */
          .oui-basic-table-wrapper .euiTableRowCell,
          .oui-basic-table-wrapper .euiTableHeaderCell {
            border-left: none;
            border-right: none;
          }

          /* Pagination styling */
          .oui-basic-table-wrapper .euiTablePagination {
            border-top: 1px solid rgb(229, 231, 235);
            padding: 0.75rem 1rem;
            background: rgb(249, 250, 251);
          }

          /* Sort arrows */
          .oui-basic-table-wrapper .euiTableSortIcon {
            color: rgb(107, 114, 128);
          }

          /* Empty state */
          .oui-basic-table-wrapper .euiTableRow-isEmptyState {
            background: rgb(249, 250, 251);
          }

          /* Loading state */
          .oui-basic-table-wrapper .euiTableRow-isLoading {
            background: rgb(249, 250, 251);
          }
        `}</style>
        <EuiBasicTable {...props} />
      </div>
    </OUI2Wrapper>
  );
}
