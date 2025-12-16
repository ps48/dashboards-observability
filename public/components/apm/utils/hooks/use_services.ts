/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PPLSearchService } from '../search_strategy/ppl_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import { getTimeInSeconds } from '../time_utils';
import { ServiceTableItem } from '../../services/types';

export interface UseServicesParams {
  startTime: Date;
  endTime: Date;
  queryIndex: string;
  environment?: string;
  refreshTrigger?: number;
}

export interface UseServicesResult {
  data: ServiceTableItem[];
  isLoading: boolean;
  error: Error | null;
  availableGroupByAttributes: Record<string, string[]>;
  refetch: () => void;
}

/**
 * Hook for fetching list of services using PPL
 *
 * Returns list of services with their basic metadata.
 *
 * @example
 * const { data, isLoading, error } = useServices({
 *   startTime: new Date(Date.now() - 3600000),
 *   endTime: new Date(),
 *   queryIndex: 'otel-apm-service-map',
 * });
 */
export const useServices = (params: UseServicesParams): UseServicesResult => {
  const [data, setData] = useState<ServiceTableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [availableGroupByAttributes, setAvailableGroupByAttributes] = useState<
    Record<string, string[]>
  >({});
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
      environment: params.environment,
    }),
    [params.queryIndex, params.startTime, params.endTime, params.environment]
  );

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await pplSearchService.listServices(fetchParams);

        console.log('[useServices] Raw response from listServices:', response);

        // Response is now an object with ServiceSummaries and AvailableGroupByAttributes
        const availableAttributes = response.AvailableGroupByAttributes || {};
        setAvailableGroupByAttributes(availableAttributes);
        console.log('[useServices] Available groupByAttributes:', availableAttributes);

        // Transform ServiceSummaries to ServiceTableItem[]
        const servicesList = response.ServiceSummaries || [];
        const services: ServiceTableItem[] = servicesList.map((svc: any) => {
          const serviceName = svc.KeyAttributes?.Name || svc.serviceName || svc.name || 'unknown';
          const environment = svc.KeyAttributes?.Environment || svc.environment || 'unknown';
          const groupByAttributes = svc.GroupByAttributes || {};

          console.log('[useServices] Mapped service:', {
            serviceName,
            environment,
            groupByAttributes,
          });

          return {
            serviceName,
            environment,
            groupByAttributes,
          };
        });

        console.log('[useServices] Final services array:', services);
        setData(services);
      } catch (err) {
        console.error('[useServices] Error fetching services:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [pplSearchService, fetchParams, refetchTrigger, params.refreshTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, isLoading, error, availableGroupByAttributes, refetch };
};
