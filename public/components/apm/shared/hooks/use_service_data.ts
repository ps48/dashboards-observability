/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { HttpSetup } from '../../../../../../src/core/public';
import { useApmApi } from './use_apm_api';
import { ServiceTableItem, ParsedTimeRange } from '../../services/types';
import { transformNodeToServiceItem } from '../../utils/service_utils';
import { getTimeInSeconds } from '../../utils/time_utils';

interface UseServiceDataParams {
  http: HttpSetup;
  timeRange: ParsedTimeRange;
  dataSourceId?: string;
}

interface UseServiceDataResult {
  tableItems: ServiceTableItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching services list using PPL query via listServices operation
 */
export const useServiceData = ({
  http,
  timeRange,
  dataSourceId = 'default',
}: UseServiceDataParams): UseServiceDataResult => {
  // Memoize params to prevent infinite loop
  const params = useMemo(
    () => ({
      startTime: getTimeInSeconds(timeRange.startTime),
      endTime: getTimeInSeconds(timeRange.endTime),
    }),
    [timeRange.startTime, timeRange.endTime]
  );

  // Memoize connection to prevent infinite loop
  const connection = useMemo(
    () => ({
      id: dataSourceId,
      type: 'DEFAULT_INDEX_PATTERNS',
    }),
    [dataSourceId]
  );

  const { data, isLoading, error, refetch } = useApmApi<any>({
    http,
    operation: 'listServices',
    params,
    connection,
  });

  // Transform PPL response to ServiceTableItem[]
  const tableItems = useMemo(() => {
    if (!data) return [];

    // Handle different response formats from PPL
    if (data.nodes && Array.isArray(data.nodes)) {
      return data.nodes.map(transformNodeToServiceItem);
    }

    if (data.services && Array.isArray(data.services)) {
      return data.services.map(transformNodeToServiceItem);
    }

    if (Array.isArray(data)) {
      return data.map(transformNodeToServiceItem);
    }

    return [];
  }, [data]);

  return {
    tableItems,
    isLoading,
    error,
    refetch,
  };
};
