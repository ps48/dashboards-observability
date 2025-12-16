/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { useTopServicesByFaultRate } from '../utils/hooks/use_top_services_by_fault_rate';
import { TimeRange } from '../services/types';
import { FaultRateCell, getRelativePercentage } from './fault_rate_cell';
import { ServiceCell } from './service_cell';

export interface TopServicesByFaultRateProps {
  timeRange: TimeRange;
  prometheusConnectionId?: string;
  onServiceClick?: (serviceName: string, environment: string) => void;
  refreshTrigger?: number;
}

interface ServiceFaultRateItem {
  serviceName: string;
  environment: string;
  faultRate: number;
  relativePercentage: number;
  href?: string;
}

/**
 * Widget displaying top services ranked by fault rate
 * Shows service name, environment, and fault rate percentage with progress bar
 */
export const TopServicesByFaultRate: React.FC<TopServicesByFaultRateProps> = ({
  timeRange,
  prometheusConnectionId,
  onServiceClick,
  refreshTrigger,
}) => {
  // Parse time range - handle both absolute and relative times
  const startTime = timeRange.from.startsWith('now')
    ? new Date(Date.now() - 15 * 60 * 1000) // Default to 15 min for relative
    : new Date(timeRange.from);
  const endTime = timeRange.to === 'now' ? new Date() : new Date(timeRange.to);

  const { data: services, isLoading, error } = useTopServicesByFaultRate({
    startTime,
    endTime,
    prometheusConnectionId,
    limit: 5,
    refreshTrigger,
  });

  // Calculate relative percentages for progress bars
  const tableItems: ServiceFaultRateItem[] = useMemo(() => {
    if (!services || services.length === 0) {
      return [];
    }

    // Calculate sum for relative percentages
    const faultRateSum = services.reduce((sum, s) => sum + s.faultRate, 0);

    return services.map((service) => ({
      serviceName: service.serviceName,
      environment: service.environment,
      faultRate: service.faultRate,
      relativePercentage: getRelativePercentage(service.faultRate, faultRateSum),
      href: `#/service-details/${encodeURIComponent(service.serviceName)}/${encodeURIComponent(
        service.environment
      )}`,
    }));
  }, [services]);

  // Define table columns
  const columns: Array<EuiBasicTableColumn<ServiceFaultRateItem>> = [
    {
      name: 'Service',
      width: '40%',
      truncateText: true,
      render: (item: ServiceFaultRateItem) => (
        <ServiceCell
          service={item.serviceName}
          environment={item.environment}
          href={item.href}
          onClick={
            onServiceClick ? () => onServiceClick(item.serviceName, item.environment) : undefined
          }
        />
      ),
    },
    {
      name: 'Fault Rate',
      width: '60%',
      render: (item: ServiceFaultRateItem) => (
        <FaultRateCell faultRate={item.faultRate} relativePercentage={item.relativePercentage} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <EuiFlexItem>
        <EuiPanel>
          <EuiText size="m">
            <h3>Top Services by Fault Rate</h3>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 150 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  if (error) {
    const isConfigError = error.message.includes('No Prometheus connection configured');
    const isAuthError =
      error.message.includes('Unauthorized') || error.message.includes('Authentication');

    return (
      <EuiFlexItem>
        <EuiPanel>
          <EuiText size="m">
            <h3>Top Services by Fault Rate</h3>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            {isConfigError || isAuthError ? (
              <p>
                Prometheus connection required. Configure a Prometheus data source to view fault
                rate metrics.
              </p>
            ) : (
              <p>Error loading fault rate data: {error.message}</p>
            )}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  if (!services || services.length === 0) {
    return (
      <EuiFlexItem>
        <EuiPanel>
          <EuiText size="m">
            <h3>Top Services by Fault Rate</h3>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            <p>No fault rate data available</p>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiText size="m">
          <h3>Top Services by Fault Rate</h3>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable items={tableItems} columns={columns} tableLayout="auto" />
      </EuiPanel>
    </EuiFlexItem>
  );
};
