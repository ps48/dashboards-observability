/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PromQLSearchService } from '../search_strategy/promql_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';

export type MetricType = 'rate' | 'errors' | 'duration';

export interface UseServiceMetricsParams {
  serviceName: string;
  environment?: string;
  metricType: MetricType;
  startTime: Date;
  endTime: Date;
  prometheusConnectionId: string;
  step?: string;
}

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface UseServiceMetricsResult {
  data: MetricDataPoint[];
  isLoading: boolean;
  error: Error | null;
  query: string;
  refetch: () => void;
}

/**
 * Hook for fetching service RED metrics using PromQL
 *
 * RED metrics:
 * - Rate: Request rate (requests per second)
 * - Errors: Error rate (percentage of failed requests)
 * - Duration: Request duration (P95 latency)
 *
 * @example
 * const { data, isLoading, error, query } = useServiceMetrics({
 *   serviceName: 'payment-service',
 *   environment: 'production',
 *   metricType: 'rate',
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   prometheusConnectionId: 'prometheus-1',
 * });
 */
export const useServiceMetrics = (params: UseServiceMetricsParams): UseServiceMetricsResult => {
  const [data, setData] = useState<MetricDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const promqlService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PromQLSearchService(coreRefs.data.search, params.prometheusConnectionId);
  }, [params.prometheusConnectionId]);

  // Build PromQL query based on metric type
  const query = useMemo(() => {
    const filters = `service_name="${params.serviceName}"${
      params.environment ? `,environment="${params.environment}"` : ''
    }`;

    switch (params.metricType) {
      case 'rate':
        // Request rate: requests per second
        return `rate(http_server_requests_seconds_count{${filters}}[5m])`;

      case 'errors':
        // Error rate: percentage of 5xx responses
        return `sum(rate(http_server_requests_seconds_count{${filters},status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count{${filters}}[5m]))`;

      case 'duration':
        // P95 latency
        return `histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{${filters}}[5m]))`;

      default:
        return `up{${filters}}`;
    }
  }, [params.metricType, params.serviceName, params.environment]);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await promqlService.executeMetricRequest({
          query,
          startTime: getTimeInSeconds(params.startTime),
          endTime: getTimeInSeconds(params.endTime),
          step: params.step || '30s',
        });

        // Transform Prometheus response to MetricDataPoint[]
        const transformedData = transformPrometheusResponse(response);
        setData(transformedData);
      } catch (err) {
        console.error('[useServiceMetrics] Error fetching metrics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [promqlService, query, params.startTime, params.endTime, params.step, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, query, refetch };
};

/**
 * Transform Prometheus response to metric data points
 */
function transformPrometheusResponse(response: any): MetricDataPoint[] {
  if (!response || !response.data || !response.data.result) {
    return [];
  }

  const results = response.data.result;
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  // Take first result (for aggregated queries)
  const firstResult = results[0];
  if (!firstResult.values || !Array.isArray(firstResult.values)) {
    return [];
  }

  // Transform [timestamp, value] pairs
  return firstResult.values.map(([timestamp, value]: [number, string]) => ({
    timestamp,
    value: parseFloat(value) || 0,
  }));
}
