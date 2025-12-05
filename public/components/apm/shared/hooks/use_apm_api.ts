/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { HttpSetup } from '../../../../../../src/core/public';
import { ApmApiConnection } from '../../services/types';

interface UseApmApiParams {
  http: HttpSetup;
  operation: string;
  params: Record<string, any>;
  connection?: ApmApiConnection;
  enabled?: boolean;
}

interface UseApmApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Core hook for calling APM API at /api/observability/apm/resources
 *
 * @param operation - PPL or Prometheus operation name (e.g., 'listServices', 'executeMetricRequest')
 * @param params - Operation-specific parameters
 * @param connection - Data source connection info (defaults to local OpenSearch)
 * @param enabled - Whether to fetch data (default: true)
 */
export const useApmApi = <T = any>({
  http,
  operation,
  params,
  connection = { id: 'default', type: 'DEFAULT_INDEX_PATTERNS' },
  enabled = true,
}: UseApmApiParams): UseApmApiResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize params and connection to prevent unnecessary re-renders
  const paramsJson = useMemo(() => JSON.stringify(params), [JSON.stringify(params)]);
  const connectionJson = useMemo(() => JSON.stringify(connection), [JSON.stringify(connection)]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        connection: JSON.parse(connectionJson),
        operation,
        params: JSON.parse(paramsJson),
      };

      console.log('[useApmApi] Making request:', requestBody);

      const response = await http.post('/api/observability/apm/resources', {
        body: JSON.stringify(requestBody),
      });

      console.log('[useApmApi] Response received:', response);
      setData(response as T);
    } catch (e) {
      console.error('[useApmApi] Error:', e);
      setError(e as Error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [http, operation, paramsJson, connectionJson, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};
