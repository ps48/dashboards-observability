/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Data source ID references - actual credentials and endpoints are resolved server-side
export const DEFAULT_PPL_DATA_SOURCE_ID = '092197b0-c599-11f0-9f90-0517413254ca';

// Prometheus configuration
// Prometheus connection ID identifies the Prometheus datasource in query enhancements
export const DEFAULT_PROMETHEUS_CONNECTION_ID = 'my-prom';

export const DEFAULT_TOPOLOGY_INDEX = 'otel-apm-service-map';
export const DEFAULT_SERVICE_MAP_INDEX = 'otel-apm-service-map';

// Operation to query index mapping
// Maps PPL client operations to their corresponding query indices
// Used internally by route handler to inject queryIndex if not provided by UI
export const OPERATION_QUERY_INDEX_MAP: Record<string, string> = {
  listServices: DEFAULT_TOPOLOGY_INDEX,
  getService: DEFAULT_TOPOLOGY_INDEX,
  listServiceOperations: DEFAULT_TOPOLOGY_INDEX,
  listServiceDependencies: DEFAULT_TOPOLOGY_INDEX,
  getServiceMap: DEFAULT_SERVICE_MAP_INDEX,
  // executeMetricRequest queries prometheus, no index needed
};

// API endpoints
export const APM_BASE_API = '/api/observability/apm';
export const APM_RESOURCES_ENDPOINT = `${APM_BASE_API}/resources`;
