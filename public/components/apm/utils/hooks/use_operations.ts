/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PPLSearchService } from '../search_strategy/ppl_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';

export interface UseOperationsParams {
  serviceName: string;
  environment?: string;
  startTime: Date;
  endTime: Date;
  queryIndex: string;
  refreshTrigger?: number;
}

export interface ServiceOperation {
  operationName: string;
  requestCount: number;
  errorRate: number; // 4xx error rate
  faultRate: number; // 5xx error rate
  avgDuration: number;
  p50Duration: number; // Median latency
  p90Duration: number; // 90th percentile latency
  p99Duration: number; // 99th percentile latency
  availability: number; // Availability percentage (0-1)
  dependencyCount: number; // Count of downstream dependencies
}

export interface UseOperationsResult {
  data: ServiceOperation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching service operations using PPL
 *
 * Returns a list of operations (endpoints/methods) for a service
 * with their performance metrics.
 *
 * @example
 * const { data, isLoading, error } = useOperations({
 *   serviceName: 'payment-service',
 *   environment: 'production',
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   queryIndex: 'otel-apm-traces',
 * });
 */
export const useOperations = (params: UseOperationsParams): UseOperationsResult => {
  const [data, setData] = useState<ServiceOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const pplSearchService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PPLSearchService(coreRefs.data.search);
  }, []);

  const fetchParams = useMemo(
    () => ({
      queryIndex: params.queryIndex,
      startTime: getTimeInSeconds(params.startTime),
      endTime: getTimeInSeconds(params.endTime),
      keyAttributes: {
        Name: params.serviceName,
        Environment: params.environment || 'unknown',
      },
    }),
    [params.queryIndex, params.serviceName, params.environment, params.startTime, params.endTime]
  );

  useEffect(() => {
    const fetchOperations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await pplSearchService.listServiceOperations(fetchParams);

        // Transform response to ServiceOperation[]
        // Response structure: {Operations: [], StartTime, EndTime, NextToken}
        const operationsArray = response.Operations || [];
        const operations: ServiceOperation[] = operationsArray.map((op: any) => ({
          operationName: op.Name || 'unknown',
          requestCount: parseInt(op.Count, 10) || 0,
          errorRate: 0, // Will be populated from Prometheus
          faultRate: 0, // Will be populated from Prometheus
          avgDuration: 0, // Will be populated from Prometheus
          p50Duration: 0, // Will be populated from Prometheus
          p90Duration: 0, // Will be populated from Prometheus
          p99Duration: 0, // Will be populated from Prometheus
          availability: 0, // Will be populated from Prometheus
          dependencyCount: 0, // Will be populated from PPL service map query
        }));

        setData(operations);
      } catch (err) {
        console.error('[useOperations] Error fetching operations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOperations();
  }, [pplSearchService, fetchParams, refetchTrigger, params.refreshTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, refetch };
};
