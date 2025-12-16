/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
} from '@elastic/eui';
import { PromQLSearchService } from '../utils/search_strategy/promql_search_service';
import { coreRefs } from '../../../framework/core_refs';
import { TimeRange } from '../services/types';
import { FaultRateCell, getRelativePercentage } from './fault_rate_cell';
import { QUERY_SERVICE_DEPENDENCY_FAULT_RATE } from '../utils/query_requests/promql_queries';
import { parseTimeRange } from '../utils/time_utils';

export interface ServiceTopDependenciesWidgetProps {
  serviceName: string;
  environment?: string;
  timeRange: TimeRange;
  prometheusConnectionId: string;
}

interface DependencyFaultRateItem {
  dependency: string;
  faultRate: number;
  relativePercentage: number;
}

/**
 * Widget displaying top 3 dependencies for a specific service ranked by fault rate
 * Matches AWS APM plugin implementation using PromQL queries
 */
export const ServiceTopDependenciesWidget: React.FC<ServiceTopDependenciesWidgetProps> = ({
  serviceName,
  environment,
  timeRange,
  prometheusConnectionId,
}) => {
  const [data, setData] = useState<Array<{ dependency: string; faultRate: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promqlSearchService = useMemo(() => {
    if (!coreRefs.data?.search) {
      return null;
    }
    return new PromQLSearchService(coreRefs.data.search, prometheusConnectionId);
  }, [prometheusConnectionId]);

  const parsedTimeRange = useMemo(() => parseTimeRange(timeRange), [timeRange]);

  useEffect(() => {
    if (!promqlSearchService) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query = QUERY_SERVICE_DEPENDENCY_FAULT_RATE(
          environment || 'generic:default',
          serviceName
        );

        // Convert Date to seconds for PromQL API
        const startTime = Math.floor(parsedTimeRange.startTime.getTime() / 1000);
        const endTime = Math.floor(parsedTimeRange.endTime.getTime() / 1000);

        const response = await promqlSearchService.executeMetricRequest({
          query,
          startTime,
          endTime,
        });

        // Parse response
        const dependencies: Array<{ dependency: string; faultRate: number }> = [];

        // Handle data frame format with instantData
        if (response?.meta?.instantData?.rows && Array.isArray(response.meta.instantData.rows)) {
          response.meta.instantData.rows.forEach((row: any) => {
            const remoteService = row.remoteService || 'unknown';
            const faultRate = parseFloat(row.Value) || 0;

            if (faultRate > 0) {
              dependencies.push({ dependency: remoteService, faultRate });
            }
          });
        }
        // Fallback to standard Prometheus response format
        else if (response?.data?.result) {
          response.data.result.forEach((series: any) => {
            const remoteService = series.metric.remoteService || 'unknown';
            let faultRate = 0;

            if (series.values && series.values.length > 0) {
              faultRate = parseFloat(series.values[series.values.length - 1][1]) || 0;
            } else if (series.value && Array.isArray(series.value)) {
              faultRate = parseFloat(series.value[1]) || 0;
            }

            if (faultRate > 0) {
              dependencies.push({ dependency: remoteService, faultRate });
            }
          });
        }

        setData(dependencies.slice(0, 5));
      } catch (err) {
        console.error('[ServiceTopDependenciesWidget] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    serviceName,
    environment,
    timeRange,
    prometheusConnectionId,
    promqlSearchService,
    parsedTimeRange,
  ]);

  // Calculate top 3 dependencies by fault rate
  const tableItems: DependencyFaultRateItem[] = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Take top 3
    const top3 = data.slice(0, 3);

    // Calculate sum for relative percentages
    const faultRateSum = top3.reduce((sum, d) => sum + d.faultRate, 0);

    return top3.map((dep) => ({
      dependency: dep.dependency,
      faultRate: dep.faultRate,
      relativePercentage: getRelativePercentage(dep.faultRate, faultRateSum),
    }));
  }, [data]);

  // Define table columns
  const columns: Array<EuiBasicTableColumn<DependencyFaultRateItem>> = [
    {
      field: 'dependency',
      name: 'Dependency',
      width: '40%',
      truncateText: true,
      render: (dependency: string) => (
        <EuiLink href="#">
          <EuiText size="s">
            <strong>{dependency}</strong>
          </EuiText>
        </EuiLink>
      ),
    },
    {
      name: 'Fault Rate',
      width: '60%',
      render: (item: DependencyFaultRateItem) => (
        <FaultRateCell faultRate={item.faultRate} relativePercentage={item.relativePercentage} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s">
          <h3>Top Dependencies by Fault Rate</h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 100 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s">
          <h3>Top Dependencies by Fault Rate</h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText color="subdued" size="s">
          <p>Error loading dependency data: {error.message}</p>
        </EuiText>
      </EuiPanel>
    );
  }

  if (!tableItems || tableItems.length === 0) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s">
          <h3>Top Dependencies by Fault Rate</h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText color="subdued" size="s">
          <p>No dependencies with faults found for this service</p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="m">
      <EuiText size="s">
        <h3>Top Dependencies by Fault Rate</h3>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable items={tableItems} columns={columns} tableLayout="auto" />
    </EuiPanel>
  );
};
