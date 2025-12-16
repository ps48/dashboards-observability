/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PromQLSearchService } from '../search_strategy/promql_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';
import { QUERY_TOP_DEPENDENCIES_BY_FAULT_RATE } from '../query_requests/promql_queries';

export interface DependencyFaultRateItem {
  source: string;
  target: string;
  environment: string;
  faultRate: number;
  faultCount: number;
  totalCount: number;
}

export interface UseTopDependenciesByFaultRateParams {
  startTime: Date;
  endTime: Date;
  prometheusConnectionId?: string;
  limit?: number;
  refreshTrigger?: number;
}

export interface UseTopDependenciesByFaultRateResult {
  data: DependencyFaultRateItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching top service dependencies by fault rate using PromQL
 *
 * Calculates fault rate per dependency path (source -> target)
 * Returns top N dependencies sorted by fault rate descending
 *
 * @example
 * const { data, isLoading } = useTopDependenciesByFaultRate({
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   limit: 5,
 * });
 */
export const useTopDependenciesByFaultRate = (
  params: UseTopDependenciesByFaultRateParams
): UseTopDependenciesByFaultRateResult => {
  const [data, setData] = useState<DependencyFaultRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const promqlSearchService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PromQLSearchService(
      coreRefs.data.search,
      params.prometheusConnectionId || 'default'
    );
  }, [params.prometheusConnectionId]);

  const fetchParams = useMemo(
    () => ({
      startTime: getTimeInSeconds(params.startTime),
      endTime: getTimeInSeconds(params.endTime),
      limit: params.limit || 5,
    }),
    [params.startTime, params.endTime, params.limit]
  );

  useEffect(() => {
    // Skip fetching if no Prometheus connection is configured
    if (!params.prometheusConnectionId) {
      setIsLoading(false);
      setError(new Error('No Prometheus connection configured'));
      setData([]);
      return;
    }

    const fetchTopDependencies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use the standardized query from promql_queries.ts
        // This query calculates: topk(5, sum(fault) / sum(request) by service, remote_service)
        console.log(
          '[useTopDependenciesByFaultRate] Fetching with query:',
          QUERY_TOP_DEPENDENCIES_BY_FAULT_RATE
        );

        const response = await promqlSearchService.executeMetricRequest({
          query: QUERY_TOP_DEPENDENCIES_BY_FAULT_RATE,
          startTime: fetchParams.startTime,
          endTime: fetchParams.endTime,
        });

        console.log(
          '[useTopDependenciesByFaultRate] Full response:',
          JSON.stringify(response, null, 2)
        );

        // Process response - handle data frame format from query enhancements plugin
        const dependencies: DependencyFaultRateItem[] = [];

        // Check for data frame format with instantData
        if (response?.meta?.instantData?.rows && Array.isArray(response.meta.instantData.rows)) {
          console.log('[useTopDependenciesByFaultRate] Using instantData format');

          response.meta.instantData.rows.forEach((row: any) => {
            const source = row.service || 'unknown';
            const target = row.remoteService || 'unknown';
            const environment = row.environment || 'unknown';
            const faultRate = parseFloat(row.Value) || 0;

            console.log('[useTopDependenciesByFaultRate] Parsed row:', {
              source,
              target,
              environment,
              faultRate,
            });

            dependencies.push({
              source,
              target,
              environment,
              faultRate,
              faultCount: 0, // Not available from this query
              totalCount: 0, // Not available from this query
            });
          });
        }
        // Fallback to standard Prometheus response format
        else if (response?.data?.result) {
          response.data.result.forEach((series: any) => {
            const source = series.metric.service || 'unknown';
            const target = series.metric.remoteService || 'unknown';
            const environment = series.metric.environment || 'unknown';

            // Get the latest value from the time series (fault rate)
            const values = series.values || [];
            const faultRate = values.length > 0 ? parseFloat(values[values.length - 1][1]) : 0;

            dependencies.push({
              source,
              target,
              environment,
              faultRate,
              faultCount: 0, // Not available from this query
              totalCount: 0, // Not available from this query
            });
          });
        }

        // Data is already sorted by PromQL topk()
        console.log('[useTopDependenciesByFaultRate] Final dependencies:', dependencies);
        setData(dependencies.slice(0, fetchParams.limit));
      } catch (err) {
        console.error('[useTopDependenciesByFaultRate] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopDependencies();
  }, [
    params.prometheusConnectionId,
    promqlSearchService,
    fetchParams,
    refetchTrigger,
    params.refreshTrigger,
  ]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, refetch };
};
