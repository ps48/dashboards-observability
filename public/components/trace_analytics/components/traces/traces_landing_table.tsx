/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiPanel,
  EuiSpacer,
  EuiText,
  PropertySort,
} from '@elastic/eui';
import { round } from 'lodash';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TRACE_ANALYTICS_DATE_FORMAT } from '../../../../../common/constants/trace_analytics';
import { TraceAnalyticsMode } from '../../home';
import { microToMilliSec, nanoToMilliSec, PanelTitle } from '../common/helper_functions';

interface TracesLandingTableProps {
  columns: string[];
  items: any[];
  refresh: (sort?: PropertySort) => Promise<void>;
  mode: TraceAnalyticsMode;
  loading: boolean;
  getTraceViewUri?: (traceId: string) => string;
  openTraceFlyout?: (traceId: string) => void;
  jaegerIndicesExist: boolean;
  dataPrepperIndicesExist: boolean;
}

export const TracesLandingTable = ({
  columns,
  items,
  refresh,
  mode,
  loading,
  getTraceViewUri,
  openTraceFlyout,
  jaegerIndicesExist,
  dataPrepperIndicesExist,
}: TracesLandingTableProps) => {
  const [tableColumns, setTableColumns] = useState<Array<EuiDataGridColumn>>([]);
  const [visibleColumns, setVisibleColumns] = useState<Array<string>>([]);
  const [tableParams, setTableParams] = useState({
    size: 10,
    page: 0,
    sortingColumns: [] as Array<{
      id: string;
      direction: 'asc' | 'desc';
    }>,
  });

  const renderTitleBar = (totalItems?: number) => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={10}>
          <PanelTitle title="Traces" totalItems={totalItems} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const titleBar = useMemo(() => renderTitleBar(items?.length), [items]);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const adjustedRowIndex = rowIndex - tableParams.page * tableParams.size;
      if (!items.hasOwnProperty(adjustedRowIndex)) return '-';
      const value = items[adjustedRowIndex][columnId];
      if ((value == null || value === '') && columnId !== 'jaegerEndTime') return '-';
      switch (columnId) {
        case 'durationInNanos':
          return `${round(nanoToMilliSec(Math.max(0, value)), 2)} ms`;
        case 'duration':
          return `${round(microToMilliSec(Math.max(0, value)), 2)} ms`;
        case 'startTime':
          return mode === 'jaeger'
            ? moment(round(microToMilliSec(Math.max(0, value)), 2)).format(
                TRACE_ANALYTICS_DATE_FORMAT
              )
            : moment(value).format(TRACE_ANALYTICS_DATE_FORMAT);
        case 'jaegerEndTime':
          return moment(
            round(
              microToMilliSec(
                Math.max(0, items[adjustedRowIndex].startTime + items[adjustedRowIndex].duration)
              ),
              2
            )
          ).format(TRACE_ANALYTICS_DATE_FORMAT);
        case 'endTime':
          return moment(value).format(TRACE_ANALYTICS_DATE_FORMAT);
        case 'status.code':
          return value === 2 ? (
            <EuiText color="danger" size="s">
              Yes
            </EuiText>
          ) : (
            'No'
          );
        default:
          return <EuiText>{value}</EuiText>;
      }
    };
  }, [items, tableParams.page, tableParams.size]);

  const onChangeItemsPerPage = useCallback((size) => setTableParams({ ...tableParams, size }), [
    tableParams,
    setTableParams,
  ]);
  const onChangePage = useCallback((page) => setTableParams({ ...tableParams, page }), [
    tableParams,
    setTableParams,
  ]);

  useEffect(() => {
    setTableColumns(columns.map((col) => ({ id: col, displayAsText: col })));
    setVisibleColumns(
      columns.filter(
        (col) =>
          !col.includes('attributes') &&
          !col.includes('dropped') &&
          !col.includes('traceGroupFields') &&
          !col.includes('traceState') &&
          !col.includes('parentSpanId') &&
          !col.includes('spanId')
      )
    );
  }, [columns]);

  return (
    <>
      <EuiPanel grow={false}>
        {titleBar}
        <EuiSpacer size="m" />
        {!loading && items.length > 0 ? (
          <EuiDataGrid
            height="460px"
            aria-label="Traces Data grid"
            columns={tableColumns}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            rowCount={items.length}
            renderCellValue={renderCellValue}
            inMemory={{ level: 'sorting' }}
            //   sorting={{ columns: sortingColumns, onSort }}
            pagination={{
              pageIndex: tableParams.page,
              pageSize: tableParams.size,
              pageSizeOptions: [10, 50, 100],
              onChangeItemsPerPage,
              onChangePage,
            }}
            toolbarVisibility={{
              showColumnSelector: true,
              showFullScreenSelector: false,
              showStyleSelector: false,
            }}
            //   onColumnResize={onColumnResize.current}
            //   onFullScreenChange={onFullScreenChange.current}
          />
        ) : (
          <EuiEmptyPrompt
            icon={<EuiLoadingLogo logo="apmApp" size="xl" />}
            title={<h3>Loading Traces</h3>}
          />
        )}
      </EuiPanel>
    </>
  );
};
