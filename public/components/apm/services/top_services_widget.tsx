/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiLoadingChart, EuiText } from '@elastic/eui';
import {
  EmbeddableStart,
  EmbeddableRenderer,
} from '../../../../../../src/plugins/embeddable/public';

interface TopServicesWidgetProps {
  embeddable: EmbeddableStart;
  timeRange: { from: string; to: string };
  prometheusConnectionId: string;
  isLoading?: boolean;
}

/**
 * TOP-K Services by Fault Count Widget
 * Uses OpenSearch Dashboards embeddable system to render Prometheus metrics
 * Creates embeddable by value (not from saved object)
 */
export const TopServicesWidget: React.FC<TopServicesWidgetProps> = ({
  embeddable,
  timeRange,
  prometheusConnectionId,
  isLoading: parentLoading = false,
}) => {
  const promqlQuery = `topk(5, sum by (service) (error{namespace="span_derived"}) + sum by (service) (fault{namespace="span_derived"}))`;

  // Get the explore embeddable factory
  const factory = useMemo(() => {
    const exploreFactory = embeddable.getEmbeddableFactory('explore');
    console.log('[TopServicesWidget] Factory found:', !!exploreFactory);
    return exploreFactory;
  }, [embeddable]);

  // Create embeddable input structure
  const input = useMemo(() => {
    const embeddableInput = {
      id: `apm-top-services-${Date.now()}`,
      timeRange: { from: timeRange.from, to: timeRange.to },
      attributes: {
        title: 'Top Services by Fault Count',
        visualization: JSON.stringify({
          title: '',
          chartType: 'bar_gauge',
          params: {
            tooltipOptions: { mode: 'all' },
            exclusive: {
              orientation: 'horizontal',
              displayMode: 'gradient',
              valueDisplay: 'valueColor',
              showUnfilledArea: true,
            },
            thresholdOptions: {
              thresholds: [],
              baseColor: '#0761c7',
            },
            valueCalculation: 'max',
            seriesLimit: 5,
            sortByMetric: true,
            titleOptions: { show: false, titleName: '' },
            labelFormat: 'name',
          },
          axesMapping: {
            y: 'Value',
            x: 'Series',
          },
        }),
        uiState: JSON.stringify({ activeTab: 'explore_visualization_tab' }),
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
            indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          }),
        },
        type: 'metrics',
        columns: ['_source'],
        sort: [],
      },
      references: [
        {
          id: prometheusConnectionId,
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
        },
      ],
    };

    console.log('[TopServicesWidget] Embeddable input:', embeddableInput);
    return embeddableInput;
  }, [timeRange, prometheusConnectionId, promqlQuery]);

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="xs">
        <h3>Top Services by Fault Count</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      {parentLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <EuiLoadingChart size="l" />
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            Loading services data...
          </EuiText>
        </div>
      ) : factory ? (
        <div
          style={{ height: '400px', width: '100%' }}
          data-test-subj="topServicesFaultCountWidget"
        >
          <EmbeddableRenderer factory={factory} input={input} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <EuiText size="s" color="danger">
            Explore embeddable factory not found. Please ensure the explore plugin is enabled.
          </EuiText>
        </div>
      )}
    </EuiPanel>
  );
};
