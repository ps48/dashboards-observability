/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { PromQLSearchService } from '../search_strategy/promql_search_service';
import { coreRefs } from '../../../../framework/core_refs';
import {
  getQueryAllDependenciesLatencyP50,
  getQueryAllDependenciesLatencyP90,
  getQueryAllDependenciesLatencyP99,
  getQueryAllDependenciesFaultRate,
  getQueryAllDependenciesErrorRate,
  getQueryAllDependenciesAvailability,
} from '../query_requests/promql_queries';

export interface DependencyMetrics {
  p50Duration: number;
  p90Duration: number;
  p99Duration: number;
  faultRate: number;
  errorRate: number;
  availability: number;
}

export interface UseDependencyMetricsParams {
  dependencies: Array<{ serviceName: string; serviceOperation: string; remoteOperation: string }>;
  currentServiceName: string; // The service making the calls
  environment: string;
  startTime: Date;
  endTime: Date;
  prometheusConnectionId: string;
  queryIndex?: string;
  refreshTrigger?: number;
}

export interface UseDependencyMetricsResult {
  metrics: Map<string, DependencyMetrics>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching Prometheus metrics for dependency table columns
 *
 * Fetches metrics for all dependencies in parallel:
 * - Latency percentiles (p50, p90, p99) from Prometheus
 * - Fault rate from Prometheus
 * - Error rate from Prometheus
 * - Availability from Prometheus
 * - Dependency count (downstream services) from PPL service map index
 *
 * Uses short time range (5 minutes) queries and takes latest value
 * to simulate instant queries with existing range query API.
 */
export const useDependencyMetrics = (
  params: UseDependencyMetricsParams
): UseDependencyMetricsResult => {
  const [metrics, setMetrics] = useState<Map<string, DependencyMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promqlService = useMemo(() => {
    if (!coreRefs.data?.search) {
      throw new Error('Data plugin search service not available');
    }
    return new PromQLSearchService(coreRefs.data.search, params.prometheusConnectionId);
  }, [params.prometheusConnectionId]);

  useEffect(() => {
    if (!params.dependencies || params.dependencies.length === 0) {
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
        // Each query returns ALL dependencies in a single response
        const [
          p50Response,
          p90Response,
          p99Response,
          faultRateResponse,
          errorRateResponse,
          availabilityResponse,
        ] = await Promise.all([
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesLatencyP50(params.environment, params.currentServiceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesLatencyP90(params.environment, params.currentServiceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesLatencyP99(params.environment, params.currentServiceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesFaultRate(params.environment, params.currentServiceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesErrorRate(params.environment, params.currentServiceName),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
          promqlService.executeMetricRequest({
            query: getQueryAllDependenciesAvailability(
              params.environment,
              params.currentServiceName
            ),
            startTime: Math.floor(fiveMinutesAgo.getTime() / 1000),
            endTime: Math.floor(now.getTime() / 1000),
          }),
        ]);

        // Initialize metrics map with default values for all dependencies
        // Use composite keys (service:serviceOp:remoteOp) to match operation-level dependencies
        const metricsMap = new Map<string, DependencyMetrics>();
        params.dependencies.forEach((dep) => {
          const compositeKey = `${dep.serviceName}:${dep.serviceOperation}:${dep.remoteOperation}`;
          metricsMap.set(compositeKey, {
            p50Duration: 0,
            p90Duration: 0,
            p99Duration: 0,
            faultRate: 0,
            errorRate: 0,
            availability: 0,
          });
        });

        // Extract metrics by dependency from each response
        extractMetricsByDependency(p50Response, metricsMap, 'p50Duration', 1000); // Convert seconds to ms
        extractMetricsByDependency(p90Response, metricsMap, 'p90Duration', 1000);
        extractMetricsByDependency(p99Response, metricsMap, 'p99Duration', 1000);
        extractMetricsByDependency(faultRateResponse, metricsMap, 'faultRate', 1);
        extractMetricsByDependency(errorRateResponse, metricsMap, 'errorRate', 1);
        extractMetricsByDependency(availabilityResponse, metricsMap, 'availability', 0.01); // Convert 0-100 to 0-1

        setMetrics(metricsMap);
      } catch (err) {
        console.error('[useDependencyMetrics] Error fetching metrics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [
    params.dependencies,
    params.currentServiceName,
    params.environment,
    params.startTime,
    params.endTime,
    params.prometheusConnectionId,
    params.queryIndex,
    params.refreshTrigger,
    promqlService,
  ]);

  return { metrics, isLoading, error };
};

/**
 * Extract metrics from consolidated PromQL response and populate metrics map
 * @param response PromQL response with multiple time series (one per dependency)
 * @param metricsMap Map to populate with metrics
 * @param metricField Field name to set in DependencyMetrics
 * @param multiplier Value multiplier (e.g., 1000 for ms conversion, 0.01 for percentage conversion)
 */
function extractMetricsByDependency(
  response: any,
  metricsMap: Map<string, DependencyMetrics>,
  metricField: keyof DependencyMetrics,
  multiplier: number
): void {
  try {
    // Handle data frame format (query enhancements plugin response)
    // Response structure: { meta: { instantData: { rows: [{Time, remoteService, operation, remoteOperation, Value}] } } }
    if (response?.meta?.instantData?.rows) {
      const rows = response.meta.instantData.rows;

      if (!Array.isArray(rows)) {
        console.warn(`[extractMetricsByDependency] Expected rows array, got:`, typeof rows);
        return;
      }

      rows.forEach((row: any) => {
        const serviceName = row.remoteService;
        const serviceOperation = row.operation;
        const remoteOperation = row.remoteOperation;
        const rawValue = parseFloat(row.Value);

        if (!serviceName || !serviceOperation || !remoteOperation) {
          console.warn(
            `[extractMetricsByDependency] Missing remoteService, operation, or remoteOperation in row:`,
            row
          );
          return;
        }

        if (isNaN(rawValue)) {
          console.warn(
            `[extractMetricsByDependency] Invalid value for ${metricField} in dependency ${serviceName}:${serviceOperation}:${remoteOperation}:`,
            row.Value
          );
        }

        const value = (isNaN(rawValue) ? 0 : rawValue) * multiplier;

        // Update metrics map using composite key
        const compositeKey = `${serviceName}:${serviceOperation}:${remoteOperation}`;
        const metrics = metricsMap.get(compositeKey);
        if (metrics) {
          (metrics as any)[metricField] = value;
        } else {
          console.warn(
            `[extractMetricsByDependency] Dependency ${compositeKey} not found in metrics map`
          );
        }
      });
      return;
    }

    // Fallback: Handle traditional Prometheus response format
    // Response structure: { data: { result: [{metric: {remoteService: "...", operation: "...", remoteOperation: "..."}, values: [...]}] } }
    const results = response.body?.data?.result || response?.data?.result || response?.result || [];

    if (!Array.isArray(results)) {
      console.warn(`[extractMetricsByDependency] Expected array, got:`, typeof results);
      return;
    }

    results.forEach((series: any) => {
      // Get dependency identifiers from metric labels (camelCase)
      const serviceName = series.metric?.remoteService;
      const serviceOperation = series.metric?.operation;
      const remoteOperation = series.metric?.remoteOperation;

      if (!serviceName || !serviceOperation || !remoteOperation) {
        console.warn(
          `[extractMetricsByDependency] Missing remoteService, operation, or remoteOperation labels in series:`,
          series
        );
        return;
      }

      // Get latest value from time series
      const values = series.values || [];
      if (values.length === 0) {
        console.warn(
          `[extractMetricsByDependency] No values for dependency ${serviceName}:${serviceOperation}:${remoteOperation}`
        );
        return;
      }

      const lastValue = values[values.length - 1];
      const rawValue = parseFloat(lastValue[1]);
      const value = (isNaN(rawValue) ? 0 : rawValue) * multiplier;

      // Update metrics map using composite key
      const compositeKey = `${serviceName}:${serviceOperation}:${remoteOperation}`;
      const metrics = metricsMap.get(compositeKey);
      if (metrics) {
        (metrics as any)[metricField] = value;
      } else {
        console.warn(
          `[extractMetricsByDependency] Dependency ${compositeKey} not found in metrics map`
        );
      }
    });
  } catch (e) {
    console.error(`[extractMetricsByDependency] Failed to extract ${metricField}:`, e);
  }
}
