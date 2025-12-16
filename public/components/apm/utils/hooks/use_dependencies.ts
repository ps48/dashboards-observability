/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PPLSearchService } from '../search_strategy/ppl_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';

export interface UseDependenciesParams {
  serviceName: string;
  environment?: string;
  startTime: Date;
  endTime: Date;
  queryIndex: string;
  refreshTrigger?: number;
}

export interface ServiceDependency {
  serviceName: string;
  environment: string;
  serviceOperation: string;
  remoteOperation: string;
  callCount: number;
  errorRate?: number;
  avgLatency?: number;
}

export interface UseDependenciesResult {
  data: ServiceDependency[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching service dependencies using PPL
 *
 * Returns upstream and downstream service dependencies
 * with call metrics.
 *
 * @example
 * const { data, isLoading, error } = useDependencies({
 *   serviceName: 'payment-service',
 *   environment: 'production',
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   queryIndex: 'otel-apm-service-map',
 * });
 */
export const useDependencies = (params: UseDependenciesParams): UseDependenciesResult => {
  const [data, setData] = useState<ServiceDependency[]>([]);
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
    const fetchDependencies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await pplSearchService.listServiceDependencies(fetchParams);

        // Response structure: { Dependencies: [...], StartTime, EndTime, NextToken }
        const responseDeps = response.Dependencies || [];

        // Transform response to ServiceDependency[]
        const dependencies: ServiceDependency[] = responseDeps.map((dep: any) => ({
          serviceName: dep.DependencyName || dep.serviceName || dep.targetService || 'unknown',
          environment: dep.Environment || dep.environment || 'generic:default',
          serviceOperation: dep.ServiceOperation || dep.serviceOperation || 'unknown',
          remoteOperation: dep.RemoteOperation || dep.remoteOperation || 'unknown',
          callCount: parseInt(dep.CallCount || dep.callCount, 10) || 0,
          errorRate: dep.errorRate ? parseFloat(dep.errorRate) : undefined,
          avgLatency: dep.avgLatency ? parseFloat(dep.avgLatency) : undefined,
        }));

        setData(dependencies);
      } catch (err) {
        console.error('[useDependencies] Error fetching dependencies:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDependencies();
  }, [pplSearchService, fetchParams, refetchTrigger, params.refreshTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, refetch };
};
