/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PromQLSearchService } from '../search_strategy/promql_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';
import { QUERY_TOP_SERVICES_BY_FAULT_RATE } from '../query_requests/promql_queries';

export interface ServiceFaultRateItem {
  serviceName: string;
  environment: string;
  faultRate: number;
  faultCount: number;
  totalCount: number;
}

export interface UseTopServicesByFaultRateParams {
  startTime: Date;
  endTime: Date;
  prometheusConnectionId?: string;
  limit?: number;
  refreshTrigger?: number;
}

export interface UseTopServicesByFaultRateResult {
  data: ServiceFaultRateItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching top services by fault rate using PromQL
 *
 * Calculates fault rate as: (sum of failed requests) / (sum of total requests)
 * Returns top N services sorted by fault rate descending
 *
 * @example
 * const { data, isLoading } = useTopServicesByFaultRate({
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   limit: 5,
 * });
 */
export const useTopServicesByFaultRate = (
  params: UseTopServicesByFaultRateParams
): UseTopServicesByFaultRateResult => {
  const [data, setData] = useState<ServiceFaultRateItem[]>([]);
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

    const fetchTopServices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use the standardized query from promql_queries.ts
        // This query calculates: topk(5, sum(fault) / sum(request))
        console.log(
          '[useTopServicesByFaultRate] Fetching with query:',
          QUERY_TOP_SERVICES_BY_FAULT_RATE
        );

        const response = await promqlSearchService.executeMetricRequest({
          query: QUERY_TOP_SERVICES_BY_FAULT_RATE,
          startTime: fetchParams.startTime,
          endTime: fetchParams.endTime,
        });

        console.log(
          '[useTopServicesByFaultRate] Full response:',
          JSON.stringify(response, null, 2)
        );

        // Process response - handle data frame format from query enhancements plugin
        const services: ServiceFaultRateItem[] = [];

        // Debug: Log response structure
        console.log('[useTopServicesByFaultRate] Response type:', typeof response);
        console.log(
          '[useTopServicesByFaultRate] Response keys:',
          response ? Object.keys(response) : 'null'
        );
        console.log('[useTopServicesByFaultRate] Has meta?', !!response?.meta);
        console.log(
          '[useTopServicesByFaultRate] Meta keys:',
          response?.meta ? Object.keys(response.meta) : 'null'
        );
        console.log('[useTopServicesByFaultRate] Has instantData?', !!response?.meta?.instantData);
        console.log(
          '[useTopServicesByFaultRate] InstantData keys:',
          response?.meta?.instantData ? Object.keys(response.meta.instantData) : 'null'
        );
        console.log('[useTopServicesByFaultRate] Has rows?', !!response?.meta?.instantData?.rows);
        console.log(
          '[useTopServicesByFaultRate] Is array?',
          Array.isArray(response?.meta?.instantData?.rows)
        );
        console.log(
          '[useTopServicesByFaultRate] Rows length:',
          response?.meta?.instantData?.rows?.length
        );

        // Check for data frame format with instantData
        if (response?.meta?.instantData?.rows && Array.isArray(response.meta.instantData.rows)) {
          console.log('[useTopServicesByFaultRate] Using instantData format');

          response.meta.instantData.rows.forEach((row: any) => {
            const serviceName = row.service || 'unknown';
            const environment = row.environment || 'unknown';
            const faultRate = parseFloat(row.Value) || 0;

            console.log('[useTopServicesByFaultRate] Parsed row:', {
              serviceName,
              environment,
              faultRate,
            });

            services.push({
              serviceName,
              environment,
              faultRate,
              faultCount: 0, // Not available from this query
              totalCount: 0, // Not available from this query
            });
          });
        }
        // Fallback to standard Prometheus response format
        else {
          const result = response?.data?.result || response?.result;

          if (result && Array.isArray(result)) {
            result.forEach((series: any) => {
              console.log('[useTopServicesByFaultRate] Processing series:', series);

              const serviceName =
                series.metric?.service || series.metric?.service_name || 'unknown';
              const environment = series.metric?.environment || 'unknown';

              // Handle both instant query (value) and range query (values) formats
              let faultRate = 0;
              if (series.value && Array.isArray(series.value) && series.value.length > 1) {
                // Instant query format: [timestamp, value]
                faultRate = parseFloat(series.value[1]) || 0;
              } else if (
                series.values &&
                Array.isArray(series.values) &&
                series.values.length > 0
              ) {
                // Range query format: [[timestamp, value], ...]
                faultRate = parseFloat(series.values[series.values.length - 1][1]) || 0;
              }

              console.log('[useTopServicesByFaultRate] Parsed:', {
                serviceName,
                environment,
                faultRate,
              });

              services.push({
                serviceName,
                environment,
                faultRate,
                faultCount: 0, // Not available from this query
                totalCount: 0, // Not available from this query
              });
            });
          } else {
            console.warn('[useTopServicesByFaultRate] No result array found in response');
          }
        }

        // Sort by fault rate descending and filter out 0% rates
        const sortedAndFiltered = services
          .filter((service) => service.faultRate > 0)
          .sort((a, b) => b.faultRate - a.faultRate)
          .slice(0, fetchParams.limit);

        console.log(
          '[useTopServicesByFaultRate] Final services (sorted & filtered):',
          sortedAndFiltered
        );
        setData(sortedAndFiltered);
      } catch (err) {
        console.error('[useTopServicesByFaultRate] Error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopServices();
  }, [params.prometheusConnectionId, fetchParams, refetchTrigger, params.refreshTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, refetch };
};
