/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { coreRefs } from '../../../framework/core_refs';
import { TimeRange } from '../services/types';
import { EmbeddableRenderer } from './embeddable_renderer';

export interface EmbeddableMetricCardProps {
  promqlQuery: string;
  prometheusConnectionId: string;
  timeRange: TimeRange;
  title: string;
  height?: number;
  invertColor?: boolean; // Whether to invert percentage color logic (for faults/errors where increase is bad)
}

/**
 * Container component for rendering PromQL metric embeddables
 *
 * This component creates and manages the lifecycle of an explore embeddable
 * that executes PromQL queries against Prometheus and displays as a metric card.
 *
 * Used for RED metric summary cards in APM service details.
 */
export const EmbeddableMetricCard: React.FC<EmbeddableMetricCardProps> = ({
  promqlQuery,
  prometheusConnectionId,
  timeRange,
  title,
  height = 120,
  invertColor = false,
}) => {
  const factory = useMemo(() => {
    return coreRefs.embeddable?.getEmbeddableFactory('explore');
  }, []);

  const input = useMemo(() => {
    return {
      id: `apm-metric-${Date.now()}-${Math.random()}`,
      timeRange: {
        from: timeRange.from,
        to: timeRange.to,
      },
      attributes: {
        title,
        visualization: JSON.stringify({
          title,
          chartType: 'metric',
          params: {
            percentageColor: invertColor ? 'inverted' : 'standard',
            showPercentage: true,
            showTitle: true,
            thresholdOptions: {
              baseColor: '#00BD6B',
              thresholds: [],
            },
            title,
            useThresholdColor: false,
            valueCalculation: 'last',
            fontSize: 32,
            titleSize: 18,
            percentageSize: 18,
          },
          axesMapping: {
            time: 'Time',
            value: 'Value',
          },
        }),
        uiState: JSON.stringify({
          activeTab: 'explore_visualization_tab',
        }),
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            query: {
              query: promqlQuery,
              language: 'PROMQL',
              dataset: {
                id: prometheusConnectionId,
                title: prometheusConnectionId,
                type: 'PROMETHEUS',
                language: 'PROMQL',
                timeFieldName: 'Time',
              },
            },
            filter: [],
          }),
        },
      },
      references: [],
    };
  }, [promqlQuery, prometheusConnectionId, timeRange, title, invertColor]);

  if (!factory) {
    return (
      <EuiPanel paddingSize="none" hasShadow={false} hasBorder style={{ height: `${height}px` }}>
        <div style={{ padding: '1rem' }}>Explore embeddable factory not available</div>
      </EuiPanel>
    );
  }

  return (
    <div style={{ height: `${height}px`, overflow: 'hidden' }}>
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        style={{ height: '100%', overflow: 'hidden' }}
      >
        <style>{`
          .visChart__container {
            overflow: hidden !important;
            height: 100%;
          }
          .embeddable {
            height: 100%;
          }
          .embeddable > div {
            height: 100% !important;
          }
        `}</style>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <EmbeddableRenderer factory={factory} input={input} />
        </div>
      </EuiPanel>
    </div>
  );
};
