/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
  EuiToolTip,
} from '@elastic/eui';
import { useDependencies, ServiceDependency } from '../../utils/hooks/use_dependencies';
import { useDependencyMetrics } from '../../utils/hooks/use_dependency_metrics';
import { TimeRange } from '../../services/types';
import { EmptyState } from '../../shared_components/empty_state';
import { DependencyFilterSidebar } from '../../shared_components/dependency_filter_sidebar';
import { parseTimeRange } from '../../utils/time_utils';
import { EmbeddablePromQLContainer } from '../../shared_components/embeddable_promql_container';
import {
  getQueryDependencyRequestsAndAvailabilityOverTime,
  getQueryDependencyFaultsAndErrorsOverTime,
  getQueryDependencyLatencyPercentilesOverTime,
} from '../../utils/query_requests/promql_queries';

// Enriched dependency type with metrics
interface EnrichedDependency extends ServiceDependency {
  p50Duration?: number;
  p90Duration?: number;
  p99Duration?: number;
  faultRate?: number;
  errorRate?: number;
  availability?: number;
}

// Grouped dependency type for table display
// Groups by (serviceName + remoteOperation), aggregating service operations
interface GroupedDependency {
  serviceName: string;
  environment: string;
  remoteOperation: string;
  serviceOperations: string[]; // Multiple operations comma-separated
  // Aggregated metrics (average or sum depending on metric type)
  callCount: number; // Sum
  p50Duration?: number; // Average
  p90Duration?: number; // Average
  p99Duration?: number; // Average
  faultRate?: number; // Average
  errorRate?: number; // Average
  availability?: number; // Average
}

export interface ServiceDependenciesProps {
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
 * ServiceDependencies - Displays upstream and downstream dependencies for a service
 *
 * Shows table with:
 * - Dependency service name
 * - Type (upstream/downstream)
 * - Environment
 * - Call count
 * - Error rate (if available)
 * - Average latency (if available)
 */
export const ServiceDependencies: React.FC<ServiceDependenciesProps> = ({
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

  const { data: dependencies, isLoading, error } = useDependencies({
    serviceName,
    environment,
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    queryIndex,
    refreshTrigger,
  });

  // Fetch Prometheus metrics for all dependencies
  const { metrics: dependencyMetrics, isLoading: metricsLoading } = useDependencyMetrics({
    dependencies: dependencies || [],
    currentServiceName: serviceName,
    environment: environment || 'generic:default',
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    prometheusConnectionId,
    queryIndex,
    refreshTrigger,
  });

  // Merge dependencies with metrics using composite keys (service:serviceOp:remoteOp)
  const enrichedDependencies = useMemo((): EnrichedDependency[] => {
    if (!dependencies) return [];

    return dependencies.map(
      (dep): EnrichedDependency => {
        const compositeKey = `${dep.serviceName}:${dep.serviceOperation}:${dep.remoteOperation}`;
        const metrics = dependencyMetrics.get(compositeKey);
        if (metrics) {
          return {
            ...dep,
            p50Duration: metrics.p50Duration,
            p90Duration: metrics.p90Duration,
            p99Duration: metrics.p99Duration,
            faultRate: metrics.faultRate,
            errorRate: metrics.errorRate,
            availability: metrics.availability,
          };
        }
        return dep;
      }
    );
  }, [dependencies, dependencyMetrics]);

  // Sorting state
  const [sortField, setSortField] = useState<keyof GroupedDependency>('availability');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);

  // Filter sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [selectedAvailabilityThresholds, setSelectedAvailabilityThresholds] = useState<string[]>(
    []
  );
  const [selectedErrorRateThresholds, setSelectedErrorRateThresholds] = useState<string[]>([]);
  const [selectedFaultRateThresholds, setSelectedFaultRateThresholds] = useState<string[]>([]);
  const [selectedServiceOperations, setSelectedServiceOperations] = useState<string[]>([]);
  const [selectedRemoteOperations, setSelectedRemoteOperations] = useState<string[]>([]);

  // Slider filter states
  const [latencyRange, setLatencyRange] = useState<[number, number]>([0, 10000]);
  const [requestsRange, setRequestsRange] = useState<[number, number]>([0, 100000]);

  // Get all unique dependency names for the filter
  const allDependencyNames = useMemo(() => {
    if (!enrichedDependencies) return [];
    return [...new Set(enrichedDependencies.map((dep) => dep.serviceName))];
  }, [enrichedDependencies]);

  // Get all unique service operations for the filter
  const allServiceOperations = useMemo(() => {
    if (!enrichedDependencies) return [];
    return [...new Set(enrichedDependencies.map((dep) => dep.serviceOperation).filter(Boolean))];
  }, [enrichedDependencies]);

  // Get all unique remote operations for the filter
  const allRemoteOperations = useMemo(() => {
    if (!enrichedDependencies) return [];
    return [...new Set(enrichedDependencies.map((dep) => dep.remoteOperation).filter(Boolean))];
  }, [enrichedDependencies]);

  // Calculate min/max for sliders from actual data
  const { latencyMin, latencyMax, requestsMin, requestsMax } = useMemo(() => {
    if (!enrichedDependencies || enrichedDependencies.length === 0) {
      return { latencyMin: 0, latencyMax: 10000, requestsMin: 0, requestsMax: 100000 };
    }

    const latencies = enrichedDependencies
      .map((d) => d.p99Duration)
      .filter((v) => v !== undefined && !isNaN(v));

    const requests = enrichedDependencies
      .map((d) => d.callCount)
      .filter((v) => v !== undefined && !isNaN(v));

    return {
      latencyMin: latencies.length > 0 ? Math.floor(Math.min(...latencies)) : 0,
      latencyMax: latencies.length > 0 ? Math.ceil(Math.max(...latencies)) : 10000,
      requestsMin: requests.length > 0 ? Math.floor(Math.min(...requests)) : 0,
      requestsMax: requests.length > 0 ? Math.ceil(Math.max(...requests)) : 100000,
    };
  }, [enrichedDependencies]);

  // Threshold matching functions for filtering
  const matchesAvailabilityThreshold = useCallback(
    (availability: number): boolean => {
      if (selectedAvailabilityThresholds.length === 0) return false;

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
    (errorRate: number): boolean => {
      if (selectedErrorRateThresholds.length === 0) return false;

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
    (faultRate: number): boolean => {
      if (selectedFaultRateThresholds.length === 0) return false;

      return selectedFaultRateThresholds.some((threshold) => {
        if (threshold === '< 1%') return faultRate < 0.01;
        if (threshold === '1-5%') return faultRate >= 0.01 && faultRate <= 0.05;
        if (threshold === '> 5%') return faultRate > 0.05;
        return false;
      });
    },
    [selectedFaultRateThresholds]
  );

  // Stage 1: Filter enriched dependencies (before grouping)
  const filteredEnrichedDeps = useMemo(() => {
    if (!enrichedDependencies) return [];

    return enrichedDependencies.filter((dep) => {
      // Filter by selected dependencies (name filter)
      if (selectedDependencies.length > 0 && !selectedDependencies.includes(dep.serviceName)) {
        return false;
      }

      // Filter by service operation
      if (
        selectedServiceOperations.length > 0 &&
        !selectedServiceOperations.includes(dep.serviceOperation)
      ) {
        return false;
      }

      // Filter by remote operation
      if (
        selectedRemoteOperations.length > 0 &&
        !selectedRemoteOperations.includes(dep.remoteOperation)
      ) {
        return false;
      }

      // Filter by latency range (p99)
      if (dep.p99Duration !== undefined && !isNaN(dep.p99Duration)) {
        if (dep.p99Duration < latencyRange[0] || dep.p99Duration > latencyRange[1]) {
          return false;
        }
      }

      // Filter by requests range
      if (dep.callCount !== undefined && !isNaN(dep.callCount)) {
        if (dep.callCount < requestsRange[0] || dep.callCount > requestsRange[1]) {
          return false;
        }
      }

      // Check if any threshold filters are selected
      const hasThresholdFilters =
        selectedAvailabilityThresholds.length > 0 ||
        selectedErrorRateThresholds.length > 0 ||
        selectedFaultRateThresholds.length > 0;

      // If no threshold filters selected, show all rows
      if (!hasThresholdFilters) {
        return true;
      }

      // Apply threshold filters with OR logic (show if ANY threshold matches)
      const hasAvailabilityData = dep.availability !== undefined && !isNaN(dep.availability);
      const hasErrorRateData = dep.errorRate !== undefined && !isNaN(dep.errorRate);
      const hasFaultRateData = dep.faultRate !== undefined && !isNaN(dep.faultRate);

      // Check if matches any selected threshold filter
      const matchesAvailability =
        hasAvailabilityData && matchesAvailabilityThreshold(dep.availability);
      const matchesErrorRate = hasErrorRateData && matchesErrorRateThreshold(dep.errorRate);
      const matchesFaultRate = hasFaultRateData && matchesFaultRateThreshold(dep.faultRate);

      // Show if ANY metric threshold matches (OR logic)
      return matchesAvailability || matchesErrorRate || matchesFaultRate;
    });
  }, [
    enrichedDependencies,
    selectedDependencies,
    selectedServiceOperations,
    selectedRemoteOperations,
    selectedAvailabilityThresholds,
    selectedErrorRateThresholds,
    selectedFaultRateThresholds,
    latencyRange,
    requestsRange,
    matchesAvailabilityThreshold,
    matchesErrorRateThreshold,
    matchesFaultRateThreshold,
  ]);

  // Stage 2: Group filtered dependencies by (serviceName + remoteOperation)
  const filteredDependencies = useMemo((): GroupedDependency[] => {
    if (!filteredEnrichedDeps || filteredEnrichedDeps.length === 0) return [];

    // Group by composite key: serviceName:remoteOperation
    const groupMap = new Map<string, EnrichedDependency[]>();

    filteredEnrichedDeps.forEach((dep) => {
      const groupKey = `${dep.serviceName}:${dep.remoteOperation}`;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(dep);
    });

    // Aggregate metrics for each group
    return Array.from(groupMap.entries()).map(([groupKey, deps]) => {
      const [dependencyServiceName, remoteOperation] = groupKey.split(':');

      // Collect all unique service operations
      const serviceOperations = [...new Set(deps.map((d) => d.serviceOperation))].filter(Boolean);

      // Sum call counts
      const callCount = deps.reduce((sum, d) => sum + (d.callCount || 0), 0);

      // Average latency metrics (only for deps that have values)
      const p50Values = deps.map((d) => d.p50Duration).filter((v) => v !== undefined && !isNaN(v));
      const p90Values = deps.map((d) => d.p90Duration).filter((v) => v !== undefined && !isNaN(v));
      const p99Values = deps.map((d) => d.p99Duration).filter((v) => v !== undefined && !isNaN(v));

      const p50Duration =
        p50Values.length > 0
          ? p50Values.reduce((sum, v) => sum + v, 0) / p50Values.length
          : undefined;
      const p90Duration =
        p90Values.length > 0
          ? p90Values.reduce((sum, v) => sum + v, 0) / p90Values.length
          : undefined;
      const p99Duration =
        p99Values.length > 0
          ? p99Values.reduce((sum, v) => sum + v, 0) / p99Values.length
          : undefined;

      // Average rate metrics
      const faultValues = deps.map((d) => d.faultRate).filter((v) => v !== undefined && !isNaN(v));
      const errorValues = deps.map((d) => d.errorRate).filter((v) => v !== undefined && !isNaN(v));
      const availValues = deps
        .map((d) => d.availability)
        .filter((v) => v !== undefined && !isNaN(v));

      const faultRate =
        faultValues.length > 0
          ? faultValues.reduce((sum, v) => sum + v, 0) / faultValues.length
          : undefined;
      const errorRate =
        errorValues.length > 0
          ? errorValues.reduce((sum, v) => sum + v, 0) / errorValues.length
          : undefined;
      const availability =
        availValues.length > 0
          ? availValues.reduce((sum, v) => sum + v, 0) / availValues.length
          : undefined;

      return {
        serviceName: dependencyServiceName,
        environment: deps[0].environment,
        remoteOperation,
        serviceOperations,
        callCount,
        p50Duration,
        p90Duration,
        p99Duration,
        faultRate,
        errorRate,
        availability,
      };
    });
  }, [filteredEnrichedDeps]);

  // Table change handler for sorting and pagination
  const onTableChange = useCallback(({ sort, page }: any) => {
    if (sort) {
      setSortField(sort.field as keyof GroupedDependency);
      setSortDirection(sort.direction);
    }
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  // Toggle expand/collapse for a row
  const toggleRowExpand = useCallback((dependencyName: string) => {
    setExpandedRows((current) => {
      const newSet = new Set(current);
      if (newSet.has(dependencyName)) {
        newSet.delete(dependencyName);
      } else {
        newSet.add(dependencyName);
      }
      return newSet;
    });
  }, []);

  // Sort dependencies based on current state
  const sortedDependencies = useMemo(() => {
    if (!filteredDependencies) return [];

    return [...filteredDependencies].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredDependencies, sortField, sortDirection]);

  // Pagination configuration
  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: sortedDependencies.length,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pageIndex, pageSize, sortedDependencies.length]
  );

  // Paginated dependencies for current page
  const paginatedDependencies = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedDependencies.slice(startIndex, endIndex);
  }, [sortedDependencies, pageIndex, pageSize]);

  // Initialize first row as expanded on initial load
  useEffect(() => {
    if (
      !hasInitializedExpansion &&
      sortedDependencies &&
      sortedDependencies.length > 0 &&
      !isLoading &&
      !metricsLoading
    ) {
      const firstDep = sortedDependencies[0];
      const firstKey = `${firstDep.serviceName}:${firstDep.remoteOperation}`;
      setExpandedRows(new Set([firstKey]));
      setHasInitializedExpansion(true);
    }
  }, [sortedDependencies, hasInitializedExpansion, isLoading, metricsLoading]);

  // Columns definition matching AWS APM UI layout
  const columns: Array<EuiBasicTableColumn<GroupedDependency>> = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        render: (dependency: GroupedDependency) => {
          const compositeKey = `${dependency.serviceName}:${dependency.remoteOperation}`;
          return (
            <EuiButtonIcon
              onClick={() => toggleRowExpand(compositeKey)}
              iconType={expandedRows.has(compositeKey) ? 'arrowDown' : 'arrowRight'}
              aria-label={expandedRows.has(compositeKey) ? 'Collapse' : 'Expand'}
              data-test-subj={`expandButton-${compositeKey}`}
            />
          );
        },
      },
      {
        field: 'serviceName',
        name: 'Dependency',
        sortable: true,
        width: '14%',
        truncateText: true,
        render: (name: string) => <strong>{name}</strong>,
      },
      {
        field: 'remoteOperation',
        name: 'Remote operation',
        sortable: true,
        width: '12%',
        truncateText: true,
        render: (operation: string) => operation || '-',
      },
      {
        field: 'serviceOperations',
        name: 'Service operation(s)',
        sortable: false,
        width: '12%',
        truncateText: true,
        render: (operations: string[]) => {
          if (!operations || operations.length === 0) return '-';

          // Sort alphabetically for consistent display
          const sortedOps = [...operations].sort();
          const displayText = sortedOps.join(', ');

          return (
            <EuiToolTip content={displayText}>
              <span>{displayText}</span>
            </EuiToolTip>
          );
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
        field: 'callCount',
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

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  // Create map of expanded row content with line charts
  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};

    expandedRows.forEach((compositeKey) => {
      const dependency = sortedDependencies.find(
        (dep) => `${dep.serviceName}:${dep.remoteOperation}` === compositeKey
      );
      if (dependency) {
        map[compositeKey] = (
          <EuiPanel color="subdued" paddingSize="m">
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="m">
              {/* Requests and Availability Chart - Combined */}
              <EuiFlexItem>
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryDependencyRequestsAndAvailabilityOverTime(
                    environment || 'generic:default',
                    serviceName,
                    dependency.serviceName,
                    dependency.remoteOperation
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
                  promqlQuery={getQueryDependencyFaultsAndErrorsOverTime(
                    environment || 'generic:default',
                    serviceName,
                    dependency.serviceName,
                    dependency.remoteOperation
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
                  promqlQuery={getQueryDependencyLatencyPercentilesOverTime(
                    environment || 'generic:default',
                    serviceName,
                    dependency.serviceName,
                    dependency.remoteOperation
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
  }, [
    expandedRows,
    sortedDependencies,
    serviceName,
    environment,
    timeRange,
    prometheusConnectionId,
  ]);

  if (isLoading || (dependencies && dependencies.length > 0 && metricsLoading)) {
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
      <EuiCallOut title="Error loading dependencies" color="danger" iconType="alert">
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <div data-test-subj="serviceDependencies">
      <EuiFlexGroup gutterSize="m" alignItems="flexStart">
        {/* Filter Sidebar */}
        <EuiFlexItem grow={false}>
          <DependencyFilterSidebar
            availabilityThresholds={['< 95%', '95-99%', '≥ 99%']}
            selectedAvailabilityThresholds={selectedAvailabilityThresholds}
            onAvailabilityThresholdsChange={setSelectedAvailabilityThresholds}
            errorRateThresholds={['< 1%', '1-5%', '> 5%']}
            selectedErrorRateThresholds={selectedErrorRateThresholds}
            onErrorRateThresholdsChange={setSelectedErrorRateThresholds}
            faultRateThresholds={['< 1%', '1-5%', '> 5%']}
            selectedFaultRateThresholds={selectedFaultRateThresholds}
            onFaultRateThresholdsChange={setSelectedFaultRateThresholds}
            dependencyNames={allDependencyNames}
            selectedDependencies={selectedDependencies}
            onDependencyChange={setSelectedDependencies}
            serviceOperations={allServiceOperations}
            selectedServiceOperations={selectedServiceOperations}
            onServiceOperationChange={setSelectedServiceOperations}
            remoteOperations={allRemoteOperations}
            selectedRemoteOperations={selectedRemoteOperations}
            onRemoteOperationChange={setSelectedRemoteOperations}
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

        {/* Dependencies Table */}
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s">
              <h3>Dependencies</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {!sortedDependencies || sortedDependencies.length === 0 ? (
              <EmptyState
                title="No dependencies found"
                body={`No dependency data available for service "${serviceName}"${
                  environment ? ` in environment "${environment}"` : ''
                } in the selected time range. Try adjusting your filters or time range.`}
                iconType="node"
              />
            ) : (
              <EuiBasicTable
                items={paginatedDependencies}
                columns={columns}
                sorting={sorting}
                pagination={pagination}
                onChange={onTableChange}
                itemId={(item) => `${item.serviceName}:${item.remoteOperation}`}
                isExpandable={true}
                itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                tableLayout="fixed"
                data-test-subj="dependenciesTable"
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
