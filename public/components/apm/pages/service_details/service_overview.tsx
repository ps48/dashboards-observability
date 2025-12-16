/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiButtonGroup,
} from '@elastic/eui';
import { useServiceDetails } from '../../utils/hooks/use_service_details';
import { EmbeddableMetricCard } from '../../shared_components/embeddable_metric_card';
import { EmbeddablePromQLContainer } from '../../shared_components/embeddable_promql_container';
import { ServiceTopDependenciesWidget } from '../../shared_components/service_top_dependencies_widget';
import { TimeRange } from '../../services/types';
import { parseTimeRange } from '../../utils/time_utils';
import {
  getQueryServiceRequests,
  getQueryServiceFaults,
  getQueryServiceErrors,
  getQueryServiceLatencyP99Card,
  getQueryServiceAvailability,
  getQueryServiceAvailabilityByOperations,
  getQueryServiceFaultRate,
  getQueryServiceErrorRateOverTime,
  getQueryTopOperationsByVolume,
  getQueryTopDependenciesByLatency,
} from '../../utils/query_requests/promql_queries';

export interface ServiceOverviewProps {
  serviceName: string;
  environment?: string;
  timeRange: TimeRange;
  queryIndex: string;
  prometheusConnectionId: string;
  refreshTrigger?: number;
}

type LatencyPercentile = 'p50' | 'p90' | 'p99';

/**
 * ServiceOverview - Displays RED metrics for a service
 * Layout matches AWS APM plugin structure
 */
export const ServiceOverview: React.FC<ServiceOverviewProps> = ({
  serviceName,
  environment,
  timeRange,
  queryIndex,
  prometheusConnectionId,
  refreshTrigger,
}) => {
  // Latency percentile selection state
  const [latencyPercentile, setLatencyPercentile] = useState<LatencyPercentile>('p99');

  // Parse time range strings to Date objects
  const parsedTimeRange = useMemo(() => parseTimeRange(timeRange), [timeRange]);

  const {
    data: serviceDetails,
    isLoading: detailsLoading,
    error: detailsError,
  } = useServiceDetails({
    serviceName,
    environment,
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    queryIndex,
    refreshTrigger,
  });

  // Get latency query based on selected percentile - includes service + dependencies
  const getLatencyQuery = (percentile: LatencyPercentile) => {
    const env = environment || 'generic:default';
    const percentileValue = percentile === 'p50' ? 0.5 : percentile === 'p90' ? 0.9 : 0.99;
    return getQueryTopDependenciesByLatency(env, serviceName, percentileValue);
  };

  // Latency percentile options for button group
  const latencyOptions = [
    {
      id: 'p50' as LatencyPercentile,
      label: 'P50',
    },
    {
      id: 'p90' as LatencyPercentile,
      label: 'P90',
    },
    {
      id: 'p99' as LatencyPercentile,
      label: 'P99',
    },
  ];

  if (detailsLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (detailsError) {
    return (
      <EuiCallOut title="Error loading service details" color="danger" iconType="alert">
        <p>{detailsError.message}</p>
      </EuiCallOut>
    );
  }

  if (!serviceDetails) {
    return (
      <EuiCallOut title="Service not found" color="warning" iconType="help">
        <p>
          No service found with name &quot;{serviceName}&quot;
          {environment && ` in environment \"${environment}\"`}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <div data-test-subj="serviceOverview">
      {/* Service Header and Top Dependencies - Side by Side */}
      <EuiFlexGroup gutterSize="l">
        {/* Metadata Panel */}
        <EuiFlexItem grow={false} style={{ minWidth: '300px' }}>
          <EuiPanel>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <strong>Environment:</strong> {serviceDetails.environment}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <strong>Type:</strong> {serviceDetails.type}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {/* Top Dependencies Widget */}
        <EuiFlexItem>
          <ServiceTopDependenciesWidget
            key={`top-deps-${refreshTrigger}`}
            serviceName={serviceName}
            environment={environment}
            timeRange={timeRange}
            prometheusConnectionId={prometheusConnectionId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Service Metrics Summary Cards */}
      <EuiPanel paddingSize="s" key={`metric-cards-${refreshTrigger}`}>
        <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
          {/* Requests - increase is good */}
          <EuiFlexItem grow={1} style={{ minWidth: '180px', maxWidth: '20%' }}>
            <EmbeddableMetricCard
              promqlQuery={getQueryServiceRequests(environment || 'generic:default', serviceName)}
              prometheusConnectionId={prometheusConnectionId}
              timeRange={timeRange}
              title="Requests"
              height={120}
              invertColor={false}
            />
          </EuiFlexItem>

          {/* Faults (5xx) - increase is bad */}
          <EuiFlexItem grow={1} style={{ minWidth: '180px', maxWidth: '20%' }}>
            <EmbeddableMetricCard
              promqlQuery={getQueryServiceFaults(environment || 'generic:default', serviceName)}
              prometheusConnectionId={prometheusConnectionId}
              timeRange={timeRange}
              title="Faults"
              height={120}
              invertColor={true}
            />
          </EuiFlexItem>

          {/* Errors (4xx) - increase is bad */}
          <EuiFlexItem grow={1} style={{ minWidth: '180px', maxWidth: '20%' }}>
            <EmbeddableMetricCard
              promqlQuery={getQueryServiceErrors(environment || 'generic:default', serviceName)}
              prometheusConnectionId={prometheusConnectionId}
              timeRange={timeRange}
              title="Errors"
              height={120}
              invertColor={true}
            />
          </EuiFlexItem>

          {/* Availability - increase is good */}
          <EuiFlexItem grow={1} style={{ minWidth: '180px', maxWidth: '20%' }}>
            <EmbeddableMetricCard
              promqlQuery={getQueryServiceAvailability(
                environment || 'generic:default',
                serviceName
              )}
              prometheusConnectionId={prometheusConnectionId}
              timeRange={timeRange}
              title="Availability"
              height={120}
              invertColor={false}
            />
          </EuiFlexItem>

          {/* Latency P99 - increase is bad */}
          <EuiFlexItem grow={1} style={{ minWidth: '180px', maxWidth: '20%' }}>
            <EmbeddableMetricCard
              promqlQuery={getQueryServiceLatencyP99Card(
                environment || 'generic:default',
                serviceName
              )}
              prometheusConnectionId={prometheusConnectionId}
              timeRange={timeRange}
              title="P99 Latency"
              height={120}
              invertColor={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />

      {/* Charts Section */}
      <EuiPanel paddingSize="m" key={`charts-${refreshTrigger}`}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {/* Latency by Service and Dependencies Chart with Percentile Picker */}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h4>Latency by Service and Dependencies</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      legend="Latency percentile selection"
                      options={latencyOptions}
                      idSelected={latencyPercentile}
                      onChange={(id) => setLatencyPercentile(id as LatencyPercentile)}
                      buttonSize="compressed"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EmbeddablePromQLContainer
                  promqlQuery={getLatencyQuery(latencyPercentile)}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title=""
                  chartType="area"
                  height={300}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* First Row: Requests by Service/Operations and Availability by Operations */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l" responsive={true}>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="xs">
                  <h4>Requests by Service and Top Operations</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryTopOperationsByVolume(
                    environment || 'generic:default',
                    serviceName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title=""
                  chartType="area"
                  height={300}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="xs">
                  <h4>Availability by Service and Operations</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryServiceAvailabilityByOperations(
                    environment || 'generic:default',
                    serviceName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title=""
                  chartType="area"
                  height={300}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Second Row: Fault Rate and Error Rate by Service/Operations */}
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="l" responsive={true}>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="xs">
                  <h4>Fault Rate by Service and Operations</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryServiceFaultRate(
                    environment || 'generic:default',
                    serviceName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title=""
                  chartType="area"
                  height={300}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="xs">
                  <h4>Error Rate by Service and Operations</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EmbeddablePromQLContainer
                  promqlQuery={getQueryServiceErrorRateOverTime(
                    environment || 'generic:default',
                    serviceName
                  )}
                  prometheusConnectionId={prometheusConnectionId}
                  timeRange={timeRange}
                  title=""
                  chartType="area"
                  height={300}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
