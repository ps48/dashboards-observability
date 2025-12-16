/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PromQLSearchService } from '../search_strategy/promql_search_service';
import { PPLSearchService } from '../search_strategy/ppl_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import {
  getQueryAllOperationsLatencyP50,
  getQueryAllOperationsLatencyP90,
  getQueryAllOperationsLatencyP99,
  getQueryAllOperationsFaultRate,
  getQueryAllOperationsErrorRate,
  getQueryAllOperationsAvailability,
} from '../query_requests/promql_queries';
import { getQueryOperationDependenciesCount } from '../query_requests/ppl_queries';
import { DEFAULT_TOPOLOGY_INDEX } from '../config';

export interface OperationMetrics {
  p50Duration: number;
  p90Duration: number;
  p99Duration: number;
  faultRate: number;
  errorRate: number; // Note: using errorRate from the operation, calculated as (request - fault)/request
  availability: number;
  dependencyCount: number;
}

export interface UseOperationMetricsParams {
  operations: Array<{ operationName: string }>;
  serviceName: string;
  environment: string;
  startTime: Date;
  endTime: Date;
  prometheusConnectionId: string;
  queryIndex?: string;
  refreshTrigger?: number;
}

export interface UseOperationMetricsResult {
  metrics: Map<string, OperationMetrics>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching Prometheus metrics for operation table columns
 *
 * Fetches metrics for all operations in parallel:
 * - Latency percentiles (p50, p90, p99) from Prometheus
 * - Fault rate from Prometheus
 * - Availability from Prometheus
 * - Dependency count from PPL service map index
 *
 * Uses short time range (5 minutes) queries and takes latest value
 * to simulate instant queries with existing range query API.
 */
export const useOperationMetrics = (
  params: UseOperationMetricsParams
): UseOperationMetricsResult => {
  const [metrics, setMetrics] = useState<Map<string, OperationMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promqlService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PromQLSearchService(coreRefs.data.search, params.prometheusConnectionId);
  }, [params.prometheusConnectionId]);

  const pplSearchService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PPLSearchService(coreRefs.data.search);
  }, []);

  useEffect(() => {
    if (!params.operations || params.operations.length === 0) {
      setMetrics(new Map());
      return;
    }

    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use short time range (last 5 minutes) for instant-like queries
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Make 6 consolidated queries (one per metric type)
        // Each query returns ALL operations in a single response
        const [
          p50Response,
          p90Response,
          p99Response,
          faultRateResponse,
          errorRateResponse,
          availabilityResponse,
        ] = await Promise.all([
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsLatencyP50(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsLatencyP90(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsLatencyP99(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsFaultRate(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsErrorRate(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllOperationsAvailability(params.environment, params.serviceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
        ]);

        // Initialize metrics map with default values for all operations
        const metricsMap = new Map<string, OperationMetrics>();
        params.operations.forEach((op) => {
          metricsMap.set(op.operationName, {
            p50Duration: 0,
            p90Duration: 0,
            p99Duration: 0,
            faultRate: 0,
            errorRate: 0,
            availability: 0,
            dependencyCount: 0,
          });
        });

        // Extract metrics by operation from each response
        extractMetricsByOperation(p50Response, metricsMap, 'p50Duration', 1000); // Convert seconds to ms
        extractMetricsByOperation(p90Response, metricsMap, 'p90Duration', 1000);
        extractMetricsByOperation(p99Response, metricsMap, 'p99Duration', 1000);
        extractMetricsByOperation(faultRateResponse, metricsMap, 'faultRate', 1);
        extractMetricsByOperation(errorRateResponse, metricsMap, 'errorRate', 1);
        extractMetricsByOperation(availabilityResponse, metricsMap, 'availability', 0.01); // Convert 0-100 to 0-1

        // Fetch dependency counts separately (PPL query per operation)
        const depCountPromises = params.operations.map(async (op) => {
          try {
            const query = getQueryOperationDependenciesCount(
              params.queryIndex || DEFAULT_TOPOLOGY_INDEX,
              Math.floor(params.startTime.getTime() / 1000),
              Math.floor(params.endTime.getTime() / 1000),
              params.environment,
              params.serviceName,
              op.operationName
            );

            console.debug(`[useOperationMetrics] Fetching dependencies for ${op.operationName}`);
            console.debug(`[useOperationMetrics] Query:`, query);

            const depCountResponse = await pplSearchService.executeQuery(
              query,
              params.queryIndex || DEFAULT_TOPOLOGY_INDEX
            );

            console.debug(
              `[useOperationMetrics] Response for ${op.operationName}:`,
              depCountResponse
            );

            const count = extractDependencyCount(depCountResponse);

            console.debug(
              `[useOperationMetrics] Dependency count for ${op.operationName}: ${count}`
            );

            const existingMetrics = metricsMap.get(op.operationName);
            if (existingMetrics) {
              existingMetrics.dependencyCount = count;
            }
          } catch (err) {
            console.warn(`Failed to fetch dependency count for ${op.operationName}:`, err);
          }
        });

        await Promise.all(depCountPromises);
        setMetrics(metricsMap);
      } catch (err) {
        console.error('[useOperationMetrics] Error fetching metrics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [
    params.operations,
    params.serviceName,
    params.environment,
    params.startTime,
    params.endTime,
    params.prometheusConnectionId,
    params.queryIndex,
    params.refreshTrigger,
    promqlService,
    pplSearchService,
  ]);

  return { metrics, isLoading, error };
};

/**
 * Extract metrics from consolidated PromQL response and populate metrics map
 * @param response PromQL response with multiple time series (one per operation)
 * @param metricsMap Map to populate with metrics
 * @param metricField Field name to set in OperationMetrics
 * @param multiplier Value multiplier (e.g., 1000 for ms conversion, 0.01 for percentage conversion)
 */
function extractMetricsByOperation(
  response: any,
  metricsMap: Map<string, OperationMetrics>,
  metricField: keyof OperationMetrics,
  multiplier: number
): void {
  try {
    // Handle data frame format (query enhancements plugin response)
    // Response structure: { meta: { instantData: { rows: [{Time, operation, Value}] } } }
    if (response?.meta?.instantData?.rows) {
      const rows = response.meta.instantData.rows;

      if (!Array.isArray(rows)) {
        console.warn(`[extractMetricsByOperation] Expected rows array, got:`, typeof rows);
        return;
      }

      rows.forEach((row: any) => {
        const operationName = row.operation;
        const rawValue = parseFloat(row.Value);

        if (!operationName) {
          console.warn(`[extractMetricsByOperation] No operation in row:`, row);
          return;
        }

        if (isNaN(rawValue)) {
          console.warn(
            `[extractMetricsByOperation] Invalid value for ${metricField} in operation ${operationName}:`,
            row.Value
          );
        }

        const value = (isNaN(rawValue) ? 0 : rawValue) * multiplier;

        // Log small but valid values to catch threshold issues
        if (value > 0 && value < 1 && metricField.includes('Duration')) {
          console.debug(
            `[extractMetricsByOperation] Small value for ${metricField} in ${operationName}: ${value} (raw: ${rawValue})`
          );
        }

        // Update metrics map
        const metrics = metricsMap.get(operationName);
        if (metrics) {
          (metrics as any)[metricField] = value;
        } else {
          console.warn(
            `[extractMetricsByOperation] Operation ${operationName} not found in metrics map`
          );
        }
      });
      return;
    }

    // Fallback: Handle traditional Prometheus response format
    // Response structure: { data: { result: [{metric: {operation: "..."}, values: [...]}] } }
    const results = response.body?.data?.result || response?.data?.result || response?.result || [];

    if (!Array.isArray(results)) {
      console.warn(`[extractMetricsByOperation] Expected array, got:`, typeof results);
      return;
    }

    results.forEach((series: any) => {
      // Get operation name from metric labels
      const operationName = series.metric?.operation;
      if (!operationName) {
        console.warn(`[extractMetricsByOperation] No operation label in series:`, series);
        return;
      }

      // Get latest value from time series
      const values = series.values || [];
      if (values.length === 0) {
        console.warn(`[extractMetricsByOperation] No values for operation ${operationName}`);
        return;
      }

      const lastValue = values[values.length - 1];
      const rawValue = parseFloat(lastValue[1]);
      const value = (isNaN(rawValue) ? 0 : rawValue) * multiplier;

      // Update metrics map
      const metrics = metricsMap.get(operationName);
      if (metrics) {
        (metrics as any)[metricField] = value;
      } else {
        console.warn(
          `[extractMetricsByOperation] Operation ${operationName} not found in metrics map`
        );
      }
    });
  } catch (e) {
    console.error(`[extractMetricsByOperation] Failed to extract ${metricField}:`, e);
  }
}

/**
 * Extract dependency count from PPL response
 * @param response PPL query response
 * @returns Dependency count or 0 if not found
 */
function extractDependencyCount(response: any): number {
  try {
    console.debug('[extractDependencyCount] Response structure:', {
      hasBody: !!response?.body,
      hasAggregations: !!response?.body?.aggregations || !!response?.aggregations,
      hasJsonData: !!response?.body?.jsonData || !!response?.jsonData,
      hasDatarows: !!response?.body?.datarows || !!response?.datarows,
    });

    // PPL stats response structure: jsonData[0].dependency_count or datarows[0][0]
    const count =
      response.body?.aggregations?.dependency_count?.value ||
      response?.aggregations?.dependency_count?.value ||
      response.body?.jsonData?.[0]?.dependency_count ||
      response?.jsonData?.[0]?.dependency_count ||
      response.body?.datarows?.[0]?.[0] || // NEW: Try datarows format
      response?.datarows?.[0]?.[0] || // NEW: Try direct datarows
      0;

    console.debug(`[extractDependencyCount] Extracted count: ${count}`);
    return parseInt(count, 10) || 0;
  } catch (e) {
    console.warn(`[extractDependencyCount] Failed to extract dependency count:`, e);
    return 0;
  }
}
