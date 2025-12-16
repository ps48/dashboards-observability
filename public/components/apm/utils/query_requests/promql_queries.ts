/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PromQL queries for APM metrics
 *
 * Metrics available from Prometheus:
 * - error: Error count metric (gauge)
 * - request: Request count metric (gauge)
 * - fault: Fault count metric (gauge)
 * - latency_seconds_seconds_bucket: Histogram buckets for latency
 * - latency_seconds_seconds_count: Count of latency observations
 * - latency_seconds_seconds_sum: Sum of latency values
 * - latency_seconds_seconds_max: Maximum latency
 * - latency_seconds_seconds_min: Minimum latency
 *
 * Common labels: service, environment, operation, remote_service
 * Note: span_kind label may not be available in all metrics
 */

// Time range for rate calculations (5 minutes)
const RATE_INTERVAL = '5m';

/**
 * Top Operations by Latency (P95)
 * Returns top 5 operations by 95th percentile latency
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const QUERY_TOP_OPERATIONS_BY_LATENCY = `
topk(5,
  histogram_quantile(0.95,
    sum by (environment, service, operation, le) (
      latency_seconds_seconds_bucket
    )
  )
)
`;

/**
 * Top Operations by Volume (Request Count) - for specific service
 * Returns top 5 operations by request count for a given service
 */
export const getQueryTopOperationsByVolume = (environment: string, serviceName: string): string => `
topk(5,
  sum by (operation) (
    request{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
or
label_replace(
  sum(request{environment="${environment}",service="${serviceName}",namespace="span_derived"}),
  "operation",
  "overall",
  "",
  ""
)
`;

/**
 * Legacy global query - kept for backward compatibility
 */
export const QUERY_TOP_OPERATIONS_BY_VOLUME = `
topk(5,
  sum by (environment, service, operation) (
    request{namespace="span_derived"}
  )
)
`;

/**
 * Top Operations by Fault Count
 * Returns top 5 operations by fault count
 */
export const QUERY_TOP_OPERATIONS_BY_FAULT = `
topk(5,
  sum by (environment, service, operation) (
    fault
  )
)
`;

/**
 * Top Dependencies by Latency - for specific service
 * Returns top 5 service dependencies by specified percentile latency
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryTopDependenciesByLatency = (
  environment: string,
  serviceName: string,
  percentile: number = 0.95
): string => `
topk(5,
  histogram_quantile(${percentile},
    sum by (remote_service, le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
    )
  )
)
or
label_replace(
  histogram_quantile(${percentile},
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
    )
  ),
  "remote_service",
  "overall",
  "",
  ""
)
`;

/**
 * Legacy global query - kept for backward compatibility
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const QUERY_TOP_DEPENDENCIES_BY_LATENCY = `
topk(5,
  histogram_quantile(0.95,
    sum by (environment, service, remote_service, le) (
      latency_seconds_seconds_bucket{namespace="span_derived"}
    )
  )
)
`;

/**
 * Top Dependencies by Volume (Call Count)
 * Returns top 5 dependencies by call count
 */
export const QUERY_TOP_DEPENDENCIES_BY_VOLUME = `
topk(5,
  sum by (environment, service, remote_service) (
    request
  )
)
`;

/**
 * Top Dependencies by Fault Count
 * Returns top 5 dependencies by fault count
 */
export const QUERY_TOP_DEPENDENCIES_BY_FAULT = `
topk(5,
  sum by (environment, service, remote_service) (
    fault
  )
)
`;

/**
 * Top Services by Fault Rate
 * Returns top 5 services by fault rate percentage
 * Formula: (faults / requests) * 100
 */
export const QUERY_TOP_SERVICES_BY_FAULT_RATE = `
topk(5,
  sum by (environment, service) (fault)
  /
  sum by (environment, service) (request)
)
`;

/**
 * Top Dependencies by Fault Rate - Service-specific
 * Returns top 5 dependencies by fault rate percentage for a specific service
 * @param environment - Environment filter (e.g., "generic:default", "production")
 * @param serviceName - Service name to get dependencies for
 */
export const getQueryTopDependenciesByFaultRate = (
  environment: string,
  serviceName: string
): string => `
topk(5,
  sum by (remoteService) (fault{environment="${environment}",service="${serviceName}",remoteService!=""})
  /
  sum by (remoteService) (request{environment="${environment}",service="${serviceName}",remoteService!=""}) * 100
)
`;

/**
 * Top Dependencies by Fault Rate - Global View
 * Returns top 5 service-to-service dependencies by fault rate percentage across ALL services
 * Groups by environment, service, and remoteService to show the full dependency path
 * Note: Uses remoteService label (camelCase) not remote_service
 */
export const QUERY_TOP_DEPENDENCIES_BY_FAULT_RATE = `
topk(5,
  sum by (environment, service, remoteService) (fault{remoteService!=""})
  /
  sum by (environment, service, remoteService) (request{remoteService!=""}) * 100
)
`;

/**
 * Service Dependency Fault Rate for a specific service
 * Returns top 5 dependencies by fault rate percentage for a given service
 *
 * @param environment - Environment filter (e.g., "production", "generic:default")
 * @param serviceName - Service name to filter
 */
export const QUERY_SERVICE_DEPENDENCY_FAULT_RATE = (
  environment: string,
  serviceName: string
): string => `
topk(5,
  sum by (remoteService) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
  /
  sum by (remoteService) (request{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""}) * 100
)
`;

/**
 * Service Request Rate (RED - Rate)
 * Returns total request count for a service
 */
export const getQueryServiceRequestRate = (environment: string, serviceName: string): string => `
sum(request{environment="${environment}",service="${serviceName}"})
`;

/**
 * Service Error Rate (RED - Errors)
 * Returns error rate percentage for a service
 */
export const getQueryServiceErrorRate = (environment: string, serviceName: string): string => `
sum(error{environment="${environment}",service="${serviceName}"})
/
sum(request{environment="${environment}",service="${serviceName}"})
`;

/**
 * Service Latency P95 (RED - Duration)
 * Returns 95th percentile latency for a service
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP95 = (environment: string, serviceName: string): string => `
histogram_quantile(0.95,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}"}
  )
)
`;

/**
 * Service Latency P50 (Median)
 * Returns median latency for a service
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP50 = (environment: string, serviceName: string): string => `
histogram_quantile(0.50,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}"}
  )
)
`;

/**
 * Service Latency P99
 * Returns 99th percentile latency for a service
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP99 = (environment: string, serviceName: string): string => `
histogram_quantile(0.99,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}"}
  )
)
`;

/**
 * Service Average Latency
 * Returns average latency for a service
 */
export const getQueryServiceLatencyAvg = (environment: string, serviceName: string): string => `
rate(latency_seconds_seconds_sum{environment="${environment}",service="${serviceName}"}[${RATE_INTERVAL}])
/
rate(latency_seconds_seconds_count{environment="${environment}",service="${serviceName}"}[${RATE_INTERVAL}])
`;

/**
 * Operation Request Rate
 * Returns total request count for a specific operation
 */
export const getQueryOperationRequestRate = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
sum(request{environment="${environment}",service="${serviceName}",operation="${operation}"})
`;

/**
 * Operation Error Rate (4xx errors)
 * Returns error rate percentage for a specific operation
 * Note: error and request are gauges
 */
export const getQueryOperationErrorRate = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
sum(error{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
/
sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
`;

/**
 * Operation Latency P95
 * Returns 95th percentile latency for a specific operation
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP95 = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.95,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}"}
  )
)
`;

/**
 * Operation Fault Rate (5xx errors)
 * Returns fault rate percentage for a specific operation
 * Note: fault and request are gauges
 */
export const getQueryOperationFaultRate = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
sum(fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
/
sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
`;

/**
 * Operation Latency P50 (Median)
 * Returns median latency for a specific operation
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP50 = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.50,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * Operation Latency P90
 * Returns 90th percentile latency for a specific operation
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP90 = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.90,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * Operation Latency P99
 * Returns 99th percentile latency for a specific operation
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP99 = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.99,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * Operation Availability (percentage of non-faulty requests)
 * Formula: (1 - (faults / requests)) * 100
 * Availability = percentage of successful requests (non-5xx)
 * Note: fault and request are gauges
 */
export const getQueryOperationAvailability = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
(1 - (
  sum(fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
  /
  sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
)) * 100
`;

/**
 * Operation Requests Over Time
 * For line chart display
 * Note: request is a gauge, not a counter, so we display the raw value over time
 */
export const getQueryOperationRequestsOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
`;

/**
 * Operation Availability Over Time
 * For line chart display
 * Formula: (1 - (faults / requests)) * 100
 */
export const getQueryOperationAvailabilityOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
(1 - (
  fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  /
  request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
)) * 100
`;

/**
 * Operation Faults Over Time (5xx errors)
 * For line chart display
 * Note: fault is a gauge
 */
export const getQueryOperationFaultsOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
`;

/**
 * Operation Errors Over Time (4xx errors)
 * For line chart display
 * Note: error is a gauge
 */
export const getQueryOperationErrorsOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
error{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
`;

/**
 * Operation Latency P50 Over Time (Median)
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP50OverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.50,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * Operation Latency P90 Over Time
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP90OverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.90,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * Operation Latency P99 Over Time
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryOperationLatencyP99OverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
histogram_quantile(0.99,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
  )
)
`;

/**
 * COMBINED: Operation Requests and Availability Over Time
 * Returns two series in a single query for multi-line chart:
 * - "Requests" series: total request count
 * - "Availability (%)" series: availability percentage
 */
export const getQueryOperationRequestsAndAvailabilityOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
label_replace(
  sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}),
  "metric_type", "Requests", "", ""
)
or
label_replace(
  (
    1 - (
      sum(fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
      /
      sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
    )
  ) * 100,
  "metric_type", "Availability (%)", "", ""
)
`;

/**
 * COMBINED: Operation Faults and Errors Over Time
 * Returns two series in a single query for multi-line chart:
 * - "Fault rate (5xx)" series: 5xx error rate as percentage
 * - "Error rate (4xx)" series: 4xx error rate as percentage
 */
export const getQueryOperationFaultsAndErrorsOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
label_replace(
  (
    sum(fault{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
    /
    sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
  ) * 100,
  "rate_type", "Fault rate (5xx)", "", ""
)
or
label_replace(
  (
    sum(error{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
    /
    sum(request{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"})
  ) * 100,
  "rate_type", "Error rate (4xx)", "", ""
)
`;

/**
 * COMBINED: Operation Latency Percentiles Over Time
 * Returns three series in a single query for multi-line chart:
 * - "p50" series: median latency
 * - "p90" series: 90th percentile latency
 * - "p99" series: 99th percentile latency
 */
export const getQueryOperationLatencyPercentilesOverTime = (
  environment: string,
  serviceName: string,
  operation: string
): string => `
label_replace(
  histogram_quantile(0.50,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
    )
  ),
  "percentile",
  "p50",
  "",
  ""
)
or
label_replace(
  histogram_quantile(0.90,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
    )
  ),
  "percentile",
  "p90",
  "",
  ""
)
or
label_replace(
  histogram_quantile(0.99,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",operation="${operation}",namespace="span_derived"}
    )
  ),
  "percentile",
  "p99",
  "",
  ""
)
`;

/**
 * CONSOLIDATED: Get all operations' fault rates for a service
 * Returns one time series per operation with operation label
 * This reduces API calls from N operations to 1 query
 */
export const getQueryAllOperationsFaultRate = (
  environment: string,
  serviceName: string
): string => `
(
  sum by (operation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum by (operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
)
`;

/**
 * CONSOLIDATED: Get all operations' error rates (4xx) for a service
 * Returns one time series per operation with operation label
 */
export const getQueryAllOperationsErrorRate = (
  environment: string,
  serviceName: string
): string => `
(
  sum by (operation) (error{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum by (operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
)
`;

/**
 * CONSOLIDATED: Get all operations' availability for a service
 * Returns one time series per operation with operation label
 * Formula: (1 - (faults / requests)) * 100
 */
export const getQueryAllOperationsAvailability = (
  environment: string,
  serviceName: string
): string => `
(1 - (
  sum by (operation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum by (operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
)) * 100
`;

/**
 * CONSOLIDATED: Get all operations' P50 latency for a service
 * Returns one time series per operation with operation label
 * Note: Include 'le' in grouping for histogram_quantile
 */
export const getQueryAllOperationsLatencyP50 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.50,
  sum by (operation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * CONSOLIDATED: Get all operations' P90 latency for a service
 * Returns one time series per operation with operation label
 */
export const getQueryAllOperationsLatencyP90 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.90,
  sum by (operation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * CONSOLIDATED: Get all operations' P99 latency for a service
 * Returns one time series per operation with operation label
 */
export const getQueryAllOperationsLatencyP99 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.99,
  sum by (operation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * Dependency Call Rate
 * Returns total call count to a specific dependency
 */
export const getQueryDependencyCallRate = (
  environment: string,
  serviceName: string,
  remoteService: string
): string => `
sum(request{environment="${environment}",service="${serviceName}",remote_service="${remoteService}"})
`;

/**
 * Dependency Error Rate
 * Returns error rate percentage for calls to a specific dependency
 */
export const getQueryDependencyErrorRate = (
  environment: string,
  serviceName: string,
  remoteService: string
): string => `
sum(error{environment="${environment}",service="${serviceName}",remote_service="${remoteService}"})
/
sum(request{environment="${environment}",service="${serviceName}",remote_service="${remoteService}"})
`;

/**
 * Dependency Latency P95
 * Returns 95th percentile latency for calls to a specific dependency
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryDependencyLatencyP95 = (
  environment: string,
  serviceName: string,
  remoteService: string
): string => `
histogram_quantile(0.95,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",remote_service="${remoteService}"}
  )
)
`;

/**
 * CONSOLIDATED DEPENDENCY QUERIES
 * These queries return metrics for ALL dependencies in a single query
 * Used by the dependencies table to efficiently fetch metrics for all rows
 */

/**
 * CONSOLIDATED: Get all dependencies' fault rates for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 */
export const getQueryAllDependenciesFaultRate = (
  environment: string,
  serviceName: string
): string => `
(
  sum by (remoteService, operation, remoteOperation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
  /
  sum by (remoteService, operation, remoteOperation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
)
`;

/**
 * CONSOLIDATED: Get all dependencies' error rates for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 */
export const getQueryAllDependenciesErrorRate = (
  environment: string,
  serviceName: string
): string => `
(
  sum by (remoteService, operation, remoteOperation) (error{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
  /
  sum by (remoteService, operation, remoteOperation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
)
`;

/**
 * CONSOLIDATED: Get all dependencies' availability for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 * Availability = (1 - fault_rate) * 100
 */
export const getQueryAllDependenciesAvailability = (
  environment: string,
  serviceName: string
): string => `
(1 - (
  sum by (remoteService, operation, remoteOperation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
  /
  sum by (remoteService, operation, remoteOperation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""})
)) * 100
`;

/**
 * CONSOLIDATED: Get all dependencies' p50 latency for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 */
export const getQueryAllDependenciesLatencyP50 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.50,
  sum by (remoteService, operation, remoteOperation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""}
  )
)
`;

/**
 * CONSOLIDATED: Get all dependencies' p90 latency for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 */
export const getQueryAllDependenciesLatencyP90 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.90,
  sum by (remoteService, operation, remoteOperation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""}
  )
)
`;

/**
 * CONSOLIDATED: Get all dependencies' p99 latency for a service
 * Returns one time series per dependency (remoteService + operation + remoteOperation)
 */
export const getQueryAllDependenciesLatencyP99 = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.99,
  sum by (remoteService, operation, remoteOperation, le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived",remoteService!=""}
  )
)
`;

/**
 * DEPENDENCY CHART QUERIES (for expandable rows)
 * These queries return time series data for visualizing dependency metrics over time
 */

/**
 * Get requests and availability over time for a specific dependency
 * Returns 2 time series: requests and availability
 */
export const getQueryDependencyRequestsAndAvailabilityOverTime = (
  environment: string,
  serviceName: string,
  remoteService: string,
  remoteOperation: string
): string => `
label_replace(
  sum(request{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""}),
  "metric", "Requests", "", ""
)
or
label_replace(
  (1 - (
    sum(fault{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
    /
    sum(request{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
  )) * 100,
  "metric", "Availability (%)", "", ""
)
`;

/**
 * Get faults and errors over time for a specific dependency
 * Returns 2 time series: fault rate and error rate
 */
export const getQueryDependencyFaultsAndErrorsOverTime = (
  environment: string,
  serviceName: string,
  remoteService: string,
  remoteOperation: string
): string => `
label_replace(
  (
    sum(fault{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
    /
    sum(request{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
  ) * 100,
  "metric", "Fault Rate (%)", "", ""
)
or
label_replace(
  (
    sum(error{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
    /
    sum(request{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""})
  ) * 100,
  "metric", "Error Rate (%)", "", ""
)
`;

/**
 * Get latency percentiles over time for a specific dependency
 * Returns 3 time series: p50, p90, p99
 */
export const getQueryDependencyLatencyPercentilesOverTime = (
  environment: string,
  serviceName: string,
  remoteService: string,
  remoteOperation: string
): string => `
label_replace(
  histogram_quantile(0.50,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""}
    )
  ) * 1000,
  "metric", "p50", "", ""
)
or
label_replace(
  histogram_quantile(0.90,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""}
    )
  ) * 1000,
  "metric", "p90", "", ""
)
or
label_replace(
  histogram_quantile(0.99,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",remoteService="${remoteService}",remoteOperation="${remoteOperation}",namespace="span_derived",remoteService!=""}
    )
  ) * 1000,
  "metric", "p99", "", ""
)
`;

/**
 * Query builder for custom time ranges
 * Allows overriding the default 5m rate interval
 */
export const buildQueryWithInterval = (queryTemplate: string, interval: string): string => {
  return queryTemplate.replace(/\[5m\]/g, `[${interval}]`);
};

/**
 * Service Detail Page Queries
 * These queries are used for the service detail overview page metric cards and charts
 */

/**
 * Service Requests (total count)
 * For metric card display
 */
export const getQueryServiceRequests = (environment: string, serviceName: string): string => `
avg(request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
`;

/**
 * Service Requests Over Time
 * For line chart display
 * Note: request is a gauge, not a counter, so we display the raw value over time
 */
export const getQueryServiceRequestsRate = (environment: string, serviceName: string): string => `
request{environment="${environment}",service="${serviceName}",namespace="span_derived"}
`;

/**
 * Service Faults (5xx errors)
 * For metric card display
 */
export const getQueryServiceFaults = (environment: string, serviceName: string): string => `
avg(fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
`;

/**
 * Service Fault Rate Over Time by Operations
 * For line chart display showing fault rate per operation (top 5)
 * Note: fault and request are gauges, so we calculate rate as ratio of current values
 */
export const getQueryServiceFaultRate = (environment: string, serviceName: string): string => `
topk(5,
  sum by (environment, service, operation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum by (environment, service, operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
)
or
label_replace(
  sum(fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum(request{environment="${environment}",service="${serviceName}",namespace="span_derived"}),
  "operation",
  "overall",
  "",
  ""
)
`;

/**
 * Service Errors (4xx errors)
 * For metric card display
 */
export const getQueryServiceErrors = (environment: string, serviceName: string): string => `
avg(error{environment="${environment}",service="${serviceName}",namespace="span_derived"})
`;

/**
 * Service Error Rate Over Time by Operations
 * For line chart display showing error rate per operation (top 5)
 * Note: error and request are gauges, so we calculate rate as ratio of current values
 */
export const getQueryServiceErrorRateOverTime = (
  environment: string,
  serviceName: string
): string => `
topk(5,
  sum by (environment, service, operation) (error{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum by (environment, service, operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
)
or
label_replace(
  sum(error{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  /
  sum(request{environment="${environment}",service="${serviceName}",namespace="span_derived"}),
  "operation",
  "overall",
  "",
  ""
)
`;

/**
 * Service Latency P99
 * For metric card display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP99Card = (environment: string, serviceName: string): string => `
histogram_quantile(0.99,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * Service Latency P50 Over Time (Median)
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP50OverTime = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.50,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * Service Latency P90 Over Time
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP90OverTime = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.90,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * Service Latency P99 Over Time
 * For line chart display
 * Note: latency_seconds_seconds_bucket is a gauge, so we don't use rate()
 */
export const getQueryServiceLatencyP99OverTime = (
  environment: string,
  serviceName: string
): string => `
histogram_quantile(0.99,
  sum by (le) (
    latency_seconds_seconds_bucket{environment="${environment}",service="${serviceName}",namespace="span_derived"}
  )
)
`;

/**
 * Service Availability (percentage of non-faulty requests)
 * For metric card display - single aggregated value
 * Formula: (1 - (faults / requests)) * 100
 * Availability = percentage of successful requests (non-5xx)
 */
export const getQueryServiceAvailability = (environment: string, serviceName: string): string => `
(1 - (avg(fault{environment="${environment}",service="${serviceName}",namespace="span_derived"}) / avg(request{environment="${environment}",service="${serviceName}",namespace="span_derived"}))) * 100
`;

/**
 * Service Availability by Operations Over Time
 * For line chart display showing availability per operation (top 5 by lowest availability)
 * Formula: (1 - (faults / requests)) * 100
 * Availability = percentage of successful requests (non-5xx)
 */
export const getQueryServiceAvailabilityByOperations = (
  environment: string,
  serviceName: string
): string => `
topk(5,
  (1 - (
    sum by (environment, service, operation) (fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
    /
    sum by (environment, service, operation) (request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  )) * 100
)
or
label_replace(
  (1 - (
    sum(fault{environment="${environment}",service="${serviceName}",namespace="span_derived"})
    /
    sum(request{environment="${environment}",service="${serviceName}",namespace="span_derived"})
  )) * 100,
  "operation",
  "overall",
  "",
  ""
)
`;
