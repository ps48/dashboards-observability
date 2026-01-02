/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Data source ID references - actual credentials and endpoints are resolved server-side
export const DEFAULT_PPL_DATA_SOURCE_ID = '88ecf710-dfd3-11f0-baff-5509258005bd';

// Prometheus configuration
// OpenSearch datasource ID routes to the correct OpenSearch cluster
export const DEFAULT_OPENSEARCH_DATASOURCE_ID = '88ecf710-dfd3-11f0-baff-5509258005bd';
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

// Dataset index patterns for navigation to logs and traces
export const DEFAULT_LOGS_DATASET = 'ss4o_logs-*-*';
export const DEFAULT_TRACES_DATASET = 'ss4o_traces-*-*';
