/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiButtonIcon,
} from '@elastic/eui';
import { useOperations, ServiceOperation } from '../../utils/hooks/use_operations';
import { useOperationMetrics } from '../../utils/hooks/use_operation_metrics';
import { TimeRange } from '../../services/types';
import { EmptyState } from '../../shared_components/empty_state';
import { EmbeddablePromQLContainer } from '../../shared_components/embeddable_promql_container';
import { OperationFilterSidebar } from '../../shared_components/operation_filter_sidebar';
import { parseTimeRange } from '../../utils/time_utils';
import {
  getQueryOperationRequestsAndAvailabilityOverTime,
  getQueryOperationFaultsAndErrorsOverTime,
  getQueryOperationLatencyPercentilesOverTime,
} from '../../utils/query_requests/promql_queries';

export interface ServiceOperationsProps {
  serviceName: string;
  environment?: string;
  timeRange: TimeRange;
  queryIndex: string;
  prometheusConnectionId: string;
  refreshTrigger?: number;
  onTimeChange?: (timeRange: TimeRange) => void;
  onRefresh?: () => void;
}

/**
 * ServiceOperations - Displays list of operations for a service
 *
 * Shows table with:
 * - Operation name (endpoint/method)
 * - Request count
 * - Error rate
 * - Average duration
 * - P95 duration
 *
 * Features:
 * - Filter bar with search and time range picker
 * - Expandable rows showing detailed RED metrics from Prometheus
 * - Sorting by any column
 */
export const ServiceOperations: React.FC<ServiceOperationsProps> = ({
  serviceName,
  environment,
  timeRange,
  queryIndex,
  prometheusConnectionId,
  refreshTrigger,
  _onTimeChange,
  _onRefresh,
}) => {
  // Parse time range strings to Date objects
  const parsedTimeRange = useMemo(() => parseTimeRange(timeRange), [timeRange]);

  const { data: operations, isLoading, error } = useOperations({
    serviceName,
    environment,
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    queryIndex,
    refreshTrigger,
  });

  // Fetch Prometheus metrics for all operations
  const { metrics: operationMetrics, isLoading: metricsLoading } = useOperationMetrics({
    operations: operations || [],
    serviceName,
    environment: environment || 'generic:default',
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    prometheusConnectionId,
    queryIndex,
    refreshTrigger,
  });

  // Merge operations with metrics
  const enrichedOperations = useMemo(() => {
    if (!operations) return [];

    return operations.map((op) => {
      const metrics = operationMetrics.get(op.operationName);
      if (metrics) {
        return {
          ...op,
          p50Duration: metrics.p50Duration,
          p90Duration: metrics.p90Duration,
          p99Duration: metrics.p99Duration,
          faultRate: metrics.faultRate,
          errorRate: metrics.errorRate,
          availability: metrics.availability,
          dependencyCount: metrics.dependencyCount,
        };
      }
      return op;
    });
  }, [operations, operationMetrics]);

  // Sorting state
  const [sortField, setSortField] = useState<keyof ServiceOperation>('availability');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);

  // Threshold filter states
  const [selectedAvailabilityThresholds, setSelectedAvailabilityThresholds] = useState<string[]>(
    []
  );
  const [selectedErrorRateThresholds, setSelectedErrorRateThresholds] = useState<string[]>([]);
  const [selectedFaultRateThresholds, setSelectedFaultRateThresholds] = useState<string[]>([]);

  // Slider filter states
  const [latencyRange, setLatencyRange] = useState<[number, number]>([0, 10000]);
  const [requestsRange, setRequestsRange] = useState<[number, number]>([0, 100000]);

  // Get all unique operation names for the filter
  const allOperationNames = useMemo(() => {
    if (!enrichedOperations) return [];
    return enrichedOperations.map((op) => op.operationName);
  }, [enrichedOperations]);

  // Calculate min/max values for sliders
  const { latencyMin, latencyMax, requestsMin, requestsMax } = useMemo(() => {
    if (!enrichedOperations || enrichedOperations.length === 0) {
      return { latencyMin: 0, latencyMax: 10000, requestsMin: 0, requestsMax: 100000 };
    }

    const latencies = enrichedOperations
      .map((op) => op.p99Duration)
      .filter((v) => v !== undefined && !isNaN(v));

    const requests = enrichedOperations.map((op) => op.requestCount).filter((v) => v !== undefined);

    const computedLatencyMin = latencies.length > 0 ? Math.floor(Math.min(...latencies)) : 0;
    const computedLatencyMax = latencies.length > 0 ? Math.ceil(Math.max(...latencies)) : 10000;
    const computedRequestsMin = requests.length > 0 ? Math.floor(Math.min(...requests)) : 0;
    const computedRequestsMax = requests.length > 0 ? Math.ceil(Math.max(...requests)) : 100000;

    return {
      latencyMin: computedLatencyMin,
      latencyMax: computedLatencyMax,
      requestsMin: computedRequestsMin,
      requestsMax: computedRequestsMax,
    };
  }, [enrichedOperations]);

  // Initialize slider ranges when data changes
  React.useEffect(() => {
    setLatencyRange([latencyMin, latencyMax]);
    setRequestsRange([requestsMin, requestsMax]);
  }, [latencyMin, latencyMax, requestsMin, requestsMax]);

  // Threshold matching functions for filtering
  const matchesAvailabilityThreshold = useCallback(
    (availability: number | undefined): boolean => {
      if (availability === undefined || selectedAvailabilityThresholds.length === 0) return false;
      return selectedAvailabilityThresholds.some((threshold) => {
        if (threshold === '< 95%') return availability < 0.95;
        if (threshold === '95-99%') return availability >= 0.95 && availability < 0.99;
        if (threshold === '≥ 99%') return availability >= 0.99;
        return false;
      });
    },
    [selectedAvailabilityThresholds]
  );

  const matchesErrorRateThreshold = useCallback(
    (errorRate: number | undefined): boolean => {
      if (errorRate === undefined || selectedErrorRateThresholds.length === 0) return false;
      return selectedErrorRateThresholds.some((threshold) => {
        if (threshold === '< 1%') return errorRate < 0.01;
        if (threshold === '1-5%') return errorRate >= 0.01 && errorRate <= 0.05;
        if (threshold === '> 5%') return errorRate > 0.05;
        return false;
      });
    },
    [selectedErrorRateThresholds]
  );

  const matchesFaultRateThreshold = useCallback(
    (faultRate: number | undefined): boolean => {
      if (faultRate === undefined || selectedFaultRateThresholds.length === 0) return false;
      return selectedFaultRateThresholds.some((threshold) => {
        if (threshold === '< 1%') return faultRate < 0.01;
        if (threshold === '1-5%') return faultRate >= 0.01 && faultRate <= 0.05;
        if (threshold === '> 5%') return faultRate > 0.05;
        return false;
      });
    },
    [selectedFaultRateThresholds]
  );

  // Filter operations based on sidebar selection
  const filteredOperations = useMemo(() => {
    if (!enrichedOperations) return [];

    return enrichedOperations.filter((op) => {
      // Operation name filter
      if (selectedOperations.length > 0 && !selectedOperations.includes(op.operationName)) {
        return false;
      }

      // Latency range filter
      if (op.p99Duration !== undefined && !isNaN(op.p99Duration)) {
        if (op.p99Duration < latencyRange[0] || op.p99Duration > latencyRange[1]) {
          return false;
        }
      }

      // Requests range filter
      if (op.requestCount !== undefined && !isNaN(op.requestCount)) {
        if (op.requestCount < requestsRange[0] || op.requestCount > requestsRange[1]) {
          return false;
        }
      }

      // Check if any threshold filters are selected
      const hasThresholdFilters =
        selectedAvailabilityThresholds.length > 0 ||
        selectedErrorRateThresholds.length > 0 ||
        selectedFaultRateThresholds.length > 0;

      // If no threshold filters selected, show all rows (that passed other filters)
      if (!hasThresholdFilters) {
        return true;
      }

      // Apply threshold filters with OR logic (show if ANY threshold matches)
      const hasAvailabilityData = op.availability !== undefined && !isNaN(op.availability);
      const hasErrorRateData = op.errorRate !== undefined && !isNaN(op.errorRate);
      const hasFaultRateData = op.faultRate !== undefined && !isNaN(op.faultRate);

      // Check if matches any selected threshold filter
      const matchesAvailability =
        hasAvailabilityData && matchesAvailabilityThreshold(op.availability);
      const matchesErrorRate = hasErrorRateData && matchesErrorRateThreshold(op.errorRate);
      const matchesFaultRate = hasFaultRateData && matchesFaultRateThreshold(op.faultRate);

      // Show if ANY metric threshold matches (OR logic)
      return matchesAvailability || matchesErrorRate || matchesFaultRate;
    });
  }, [
    enrichedOperations,
    selectedOperations,
    selectedAvailabilityThresholds,
    selectedErrorRateThresholds,
    selectedFaultRateThresholds,
    latencyRange,
    requestsRange,
    matchesAvailabilityThreshold,
    matchesErrorRateThreshold,
    matchesFaultRateThreshold,
  ]);

  // Table change handler for sorting and pagination
  const onTableChange = useCallback(({ sort, page }: any) => {
    if (sort) {
      setSortField(sort.field as keyof ServiceOperation);
      setSortDirection(sort.direction);
    }
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  // Sort operations based on current state
  const sortedOperations = useMemo(() => {
    if (!filteredOperations) return [];

    return [...filteredOperations].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredOperations, sortField, sortDirection]);

  // Toggle expand/collapse for a row
  const toggleRowExpand = useCallback((operationName: string) => {
    setExpandedRows((current) => {
      const newSet = new Set(current);
      if (newSet.has(operationName)) {
        newSet.delete(operationName);
      } else {
        newSet.add(operationName);
      }
      return newSet;
    });
  }, []);

  // Pagination configuration
  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: sortedOperations.length,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pageIndex, pageSize, sortedOperations.length]
  );

  // Track if we've initialized the first row expansion
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);

  // Initialize first row as expanded on initial load
  React.useEffect(() => {
    if (
      !hasInitializedExpansion &&
      sortedOperations &&
      sortedOperations.length > 0 &&
      !isLoading &&
      !metricsLoading
    ) {
      const firstOp = sortedOperations[0];
      setExpandedRows(new Set([firstOp.operationName]));
      setHasInitializedExpansion(true);
    }
  }, [sortedOperations, hasInitializedExpansion, isLoading, metricsLoading]);

  // Paginated operations for current page
  const paginatedOperations = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedOperations.slice(startIndex, endIndex);
  }, [sortedOperations, pageIndex, pageSize]);

  // Columns definition matching AWS APM plugin layout
  const columns: Array<EuiBasicTableColumn<ServiceOperation>> = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        render: (operation: ServiceOperation) => (
          <EuiButtonIcon
            onClick={() => toggleRowExpand(operation.operationName)}
            iconType={expandedRows.has(operation.operationName) ? 'arrowDown' : 'arrowRight'}
            aria-label={expandedRows.has(operation.operationName) ? 'Collapse' : 'Expand'}
            data-test-subj={`expandButton-${operation.operationName}`}
          />
        ),
      },
      {
        field: 'operationName',
        name: 'Name',
        sortable: true,
        width: '18%',
        truncateText: true,
        render: (operationName: string) => <strong>{operationName}</strong>,
      },
      {
        field: 'dependencyCount',
        name: 'Dependencies',
        sortable: true,
        dataType: 'number',
        width: '10%',
        render: (count: number) => {
          if (count === undefined || count === null) {
            return '-';
          }
          return count.toString();
        },
      },
      {
        field: 'p99Duration',
        name: 'Latency p99',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (duration: number) => {
          if (duration === undefined || duration === null || isNaN(duration)) {
            return '-';
          }
          return `${duration.toFixed(2)} ms`;
        },
      },
      {
        field: 'p90Duration',
        name: 'Latency p90',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (duration: number) => {
          if (duration === undefined || duration === null || isNaN(duration)) {
            return '-';
          }
          return `${duration.toFixed(2)} ms`;
        },
      },
      {
        field: 'p50Duration',
        name: 'Latency p50',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (duration: number) => {
          if (duration === undefined || duration === null || isNaN(duration)) {
            return '-';
          }
          return `${duration.toFixed(2)} ms`;
        },
      },
      {
        field: 'requestCount',
        name: 'Requests',
        sortable: true,
        dataType: 'number',
        width: '8%',
        render: (count: number) => count.toLocaleString(),
      },
      {
        field: 'faultRate',
        name: 'Fault rate',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (rate: number) => {
          const percentage = (rate * 100).toFixed(2);
          const color =
            rate === 0 ? 'success' : rate > 0.05 ? 'danger' : rate > 0.01 ? 'warning' : 'success';
          return <EuiHealth color={color}>{percentage}%</EuiHealth>;
        },
      },
      {
        field: 'errorRate',
        name: 'Error rate',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (rate: number) => {
          const percentage = (rate * 100).toFixed(2);
          const color =
            rate === 0 ? 'success' : rate > 0.05 ? 'danger' : rate > 0.01 ? 'warning' : 'success';
          return <EuiHealth color={color}>{percentage}%</EuiHealth>;
        },
      },
      {
        field: 'availability',
        name: 'Availability',
        sortable: true,
        dataType: 'number',
        width: '9%',
        render: (avail: number) => {
          const percentage = (avail * 100).toFixed(1);
          const color =
            avail === 0
              ? 'danger'
              : avail >= 0.99
              ? 'success'
              : avail >= 0.95
              ? 'warning'
              : 'danger';
          return <EuiHealth color={color}>{percentage}%</EuiHealth>;
        },
      },
    ],
    [expandedRows, toggleRowExpand]
  );

  // Create map of expanded row content with line charts
  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};

    expandedRows.forEach((operationName) => {
      const operation = sortedOperations.find((op) => op.operationName === operationName);
      if (operation) {
        map[operationName] = (
          <EuiPanel color="subdued" paddingSize="m">
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="m">
              {/* Requests and Availability Chart - Combined */}
              <EuiFlexItem>
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryOperationRequestsAndAvailabilityOverTime(
                    environment || 'generic:default',
                    serviceName,
                    operationName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title="Requests and Availability"
                  chartType="line"
                  height={250}
                />
              </EuiFlexItem>

              {/* Faults and Errors Chart - Combined */}
              <EuiFlexItem>
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryOperationFaultsAndErrorsOverTime(
                    environment || 'generic:default',
                    serviceName,
                    operationName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title="Faults and Errors"
                  chartType="line"
                  height={250}
                />
              </EuiFlexItem>

              {/* Latency Percentiles Chart - Combined */}
              <EuiFlexItem>
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryOperationLatencyPercentilesOverTime(
                    environment || 'generic:default',
                    serviceName,
                    operationName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title="Latency (p50, p90, p99)"
                  chartType="line"
                  height={250}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        );
      }
    });

    return map;
  }, [expandedRows, sortedOperations, serviceName, environment, timeRange, prometheusConnectionId]);

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  if (isLoading || (operations && operations.length > 0 && metricsLoading)) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut title="Error loading operations" color="danger" iconType="alert">
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  if (!sortedOperations || sortedOperations.length === 0) {
    return (
      <EmptyState
        title="No operations found"
        body={`No operations data available for service "${serviceName}"${
          environment ? ` in environment "${environment}"` : ''
        } in the selected time range.`}
        iconType="search"
      />
    );
  }

  return (
    <div data-test-subj="serviceOperations">
      <EuiFlexGroup gutterSize="m" alignItems="flexStart">
        {/* Filter Sidebar */}
        <EuiFlexItem grow={false}>
          <OperationFilterSidebar
            availabilityThresholds={['< 95%', '95-99%', '≥ 99%']}
            selectedAvailabilityThresholds={selectedAvailabilityThresholds}
            onAvailabilityThresholdsChange={setSelectedAvailabilityThresholds}
            errorRateThresholds={['< 1%', '1-5%', '> 5%']}
            selectedErrorRateThresholds={selectedErrorRateThresholds}
            onErrorRateThresholdsChange={setSelectedErrorRateThresholds}
            faultRateThresholds={['< 1%', '1-5%', '> 5%']}
            selectedFaultRateThresholds={selectedFaultRateThresholds}
            onFaultRateThresholdsChange={setSelectedFaultRateThresholds}
            operationNames={allOperationNames}
            selectedOperations={selectedOperations}
            onOperationChange={setSelectedOperations}
            latencyRange={latencyRange}
            onLatencyRangeChange={setLatencyRange}
            latencyMin={latencyMin}
            latencyMax={latencyMax}
            requestsRange={requestsRange}
            onRequestsRangeChange={setRequestsRange}
            requestsMin={requestsMin}
            requestsMax={requestsMax}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </EuiFlexItem>

        {/* Operations Table */}
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s">
              <h3>Operations</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {sortedOperations.length === 0 ? (
              <EmptyState
                title="No operations found"
                body="No operations data available for this service in the selected time range."
                iconType="search"
              />
            ) : (
              <EuiBasicTable
                items={paginatedOperations}
                columns={columns}
                sorting={sorting}
                pagination={pagination}
                onChange={onTableChange}
                itemId="operationName"
                isExpandable={true}
                itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                tableLayout="fixed"
                data-test-subj="operationsTable"
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
