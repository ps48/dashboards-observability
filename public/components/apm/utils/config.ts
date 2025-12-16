/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Data source ID references - actual credentials and endpoints are resolved server-side
export const DEFAULT_PPL_DATA_SOURCE_ID = '6cfa38e0-d206-11f0-a7d0-65a8fe88d981';

// Prometheus configuration
// OpenSearch datasource ID routes to the correct OpenSearch cluster
export const DEFAULT_OPENSEARCH_DATASOURCE_ID = '6cfa38e0-d206-11f0-a7d0-65a8fe88d981';
// Prometheus connection name identifies the Prometheus datasource within the SQL plugin
export const DEFAULT_PROMETHEUS_CONNECTION_NAME = 'my-prom';

export const DEFAULT_TOPOLOGY_INDEX = 'otel-apm-service-map';
export const DEFAULT_SERVICE_MAP_INDEX = 'otel-apm-service-map';

// Resource type to query index mapping
// Maps resource types to their corresponding query indices
export const RESOURCE_QUERY_INDEX_MAP: Record<string, string> = {
  services: DEFAULT_TOPOLOGY_INDEX,
  service: DEFAULT_TOPOLOGY_INDEX,
  'service-operations': DEFAULT_TOPOLOGY_INDEX,
  'service-dependencies': DEFAULT_TOPOLOGY_INDEX,
  'service-map': DEFAULT_SERVICE_MAP_INDEX,
  // metricData queries prometheus, no index needed
};
