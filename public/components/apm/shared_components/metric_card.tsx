/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiPanel,
  EuiText,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiHealth,
} from '@elastic/eui';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  color?: 'success' | 'warning' | 'danger' | 'default';
}

/**
 * MetricCard - Displays a single metric with title and value
 *
 * Simple card component for displaying service metrics like request rate,
 * error rate, and latency.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  isLoading = false,
  isError = false,
  errorMessage = 'Error loading metric',
  color = 'default',
}) => {
  const getHealthColor = (): 'success' | 'warning' | 'danger' | 'subdued' => {
    switch (color) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      default:
        return 'subdued';
    }
  };

  if (isError) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s" color="subdued">
          <strong>{title}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText color="danger" size="s">
          {errorMessage}
        </EuiText>
      </EuiPanel>
    );
  }

  if (isLoading) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s" color="subdued">
          <strong>{title}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLoadingSpinner size="m" />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
            {color !== 'default' && (
              <EuiFlexItem grow={false}>
                <EuiHealth color={getHealthColor()} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="l">
                <strong>{value}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {subtitle && (
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {subtitle}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
