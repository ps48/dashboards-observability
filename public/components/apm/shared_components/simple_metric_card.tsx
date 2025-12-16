/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiLoadingChart, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { coreRefs } from '../../../framework/core_refs';
import { TimeRange } from '../services/types';
import { parseTimeRange } from '../utils/time_utils';

export interface SimpleMetricCardProps {
  promqlQuery: string;
  prometheusConnectionId: string;
  timeRange: TimeRange;
  title: string;
  formatValue?: (value: number) => string;
  height?: number;
}

/**
 * SimpleMetricCard - Displays a single metric value from PromQL
 *
 * Fetches data directly using the PromQL API and displays the last value
 */
export const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  promqlQuery,
  prometheusConnectionId,
  timeRange,
  title,
  formatValue,
  height = 120,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    const fetchMetric = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const parsedTimeRange = parseTimeRange(timeRange);
        const startTime = Math.floor(parsedTimeRange.startTime.getTime() / 1000);
        const endTime = Math.floor(parsedTimeRange.endTime.getTime() / 1000);

        const requestBody = {
          query: promqlQuery,
          prometheusConnectionName: prometheusConnectionId,
          opensearchDataSourceId: 'default',
          timeRange: {
            from: new Date(startTime * 1000).toISOString(),
            to: new Date(endTime * 1000).toISOString(),
          },
        };

        const response = await coreRefs.http!.post('/api/apm/promql/query', {
          body: JSON.stringify(requestBody),
        });

        console.log('[SimpleMetricCard] Response:', response);

        // Extract value from response
        if (response?.instantData && response.instantData.length > 0) {
          const lastValue = response.instantData[response.instantData.length - 1]?.value;
          if (lastValue !== undefined && lastValue !== null) {
            setValue(parseFloat(lastValue));
          } else {
            setValue(null);
          }
        } else {
          setValue(null);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('[SimpleMetricCard] Error fetching metric:', err);
        setError(err.message || 'Failed to load metric');
        setIsLoading(false);
      }
    };

    fetchMetric();
  }, [promqlQuery, prometheusConnectionId, timeRange]);

  const displayValue =
    value !== null ? (formatValue ? formatValue(value) : value.toFixed(2)) : 'N/A';

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder style={{ height: `${height}px` }}>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false} style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem
          grow={true}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isLoading && <EuiLoadingChart size="m" />}

          {error && (
            <EuiText color="danger" size="s">
              {error}
            </EuiText>
          )}

          {!isLoading && !error && (
            <EuiText size="l">
              <strong>{displayValue}</strong>
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
