/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiText, EuiSpacer } from '@elastic/eui';
import { coreRefs } from '../../../../framework/core_refs';
import { TimeRange } from '../../services/types';
import { EmbeddableRenderer } from '../embeddable_renderer';

export interface EmbeddablePromQLContainerProps {
  promqlQuery: string;
  prometheusConnectionId: string;
  timeRange: TimeRange;
  title: string;
  chartType?: 'line' | 'bar' | 'area';
  height?: number;
}

/**
 * Container component for rendering PromQL embeddables
 *
 * This component creates and manages the lifecycle of an explore embeddable
 * that executes PromQL queries against Prometheus.
 *
 * Used for RED metrics visualization in APM service details.
 */
export const EmbeddablePromQLContainer: React.FC<EmbeddablePromQLContainerProps> = ({
  promqlQuery,
  prometheusConnectionId,
  timeRange,
  title,
  _chartType = 'line',
  height = 300,
}) => {
  const factory = useMemo(() => {
    return coreRefs.embeddable?.getEmbeddableFactory('explore');
  }, []);

  const input = useMemo(() => {
    // Use echarts_line with proper configuration
    const visualization = {
      title: '',
      chartType: 'echarts_line',
      params: {
        addLegend: true,
        legendTitle: '',
        legendPosition: 'bottom',
        lineMode: 'straight',
        lineWidth: 2,
        showSymbol: false,
        symbolSize: 4,
        areaStyle: false,
        areaOpacity: 0.3,
        tooltipOptions: {
          mode: 'all',
        },
        titleOptions: {
          show: false,
          titleName: '',
        },
        showXAxisLabel: true,
        showYAxisLabel: true,
      },
      axesMapping: {
        x: 'Time',
        y: 'Value',
        color: 'Series',
      },
    };

    return {
      id: `apm-promql-${Date.now()}-${Math.random()}`,
      timeRange: {
        from: timeRange.from,
        to: timeRange.to,
      },
      attributes: {
        title,
        visualization: JSON.stringify(visualization),
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
  }, [promqlQuery, prometheusConnectionId, timeRange, title]);

  if (!factory) {
    return (
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        <EuiText size="s">
          <h4>{title}</h4>
        </EuiText>
        <EuiSpacer size="s" />
        <div style={{ padding: '1rem' }}>Explore embeddable factory not available</div>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <style>{`
        .visChart__container {
          overflow: visible !important;
        }
      `}</style>
      {title && (
        <>
          <EuiText size="s">
            <h4>{title}</h4>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      <div style={{ width: '100%', minHeight: `${height}px` }}>
        <EmbeddableRenderer factory={factory} input={input} />
      </div>
    </EuiPanel>
  );
};
