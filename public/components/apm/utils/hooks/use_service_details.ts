/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PPLSearchService } from '../search_strategy/ppl_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';

export interface UseServiceDetailsParams {
  serviceName: string;
  environment?: string;
  startTime: Date;
  endTime: Date;
  queryIndex: string;
  refreshTrigger?: number;
}

export interface ServiceDetails {
  serviceName: string;
  environment: string;
  type?: string;
  // Additional service metadata can be added here
}

export interface UseServiceDetailsResult {
  data: ServiceDetails | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching service details using PPL
 *
 * Uses PPLSearchService.getService() to retrieve detailed information
 * about a specific service.
 *
 * @example
 * const { data, isLoading, error, refetch } = useServiceDetails({
 *   serviceName: 'payment-service',
 *   environment: 'production',
 *   startTime: new Date('2025-01-01'),
 *   endTime: new Date(),
 *   queryIndex: 'otel-apm-service-map',
 * });
 */
export const useServiceDetails = (params: UseServiceDetailsParams): UseServiceDetailsResult => {
  const [data, setData] = useState<ServiceDetails | null>(null);
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
    const fetchServiceDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[useServiceDetails] Fetching with params:', fetchParams);
        const response = await pplSearchService.getService(fetchParams);
        console.log('[useServiceDetails] Response:', response);

        // Response format: { Service: { KeyAttributes: { Name, Environment, Type }, ... }, StartTime, EndTime }
        if (response && response.Service && response.Service.KeyAttributes) {
          const keyAttributes = response.Service.KeyAttributes;
          setData({
            serviceName: keyAttributes.Name || params.serviceName,
            environment: keyAttributes.Environment || params.environment || 'unknown',
            type: keyAttributes.Type || 'SERVICE',
          });
        } else {
          console.warn('[useServiceDetails] No service found in response');
          setData(null);
        }
      } catch (err) {
        console.error('[useServiceDetails] Error fetching service details:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceDetails();
  }, [
    pplSearchService,
    fetchParams,
    refetchTrigger,
    params.serviceName,
    params.environment,
    params.refreshTrigger,
  ]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, refetch };
};
