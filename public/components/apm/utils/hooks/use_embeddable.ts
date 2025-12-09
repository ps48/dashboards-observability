/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { coreRefs } from '../../../../framework/core_refs';
import { TimeRange } from '../../services/types';

interface CreateEmbeddableParams {
  promqlQuery: string;
  prometheusConnectionId: string;
  timeRange: TimeRange;
  title: string;
  chartType?: 'line' | 'bar' | 'area';
}

/**
 * Hook for creating explore embeddables with PromQL queries
 *
 * This follows the pattern from public/components/metrics/view/metrics_grid.tsx
 * but simplified for APM use cases.
 *
 * The explore embeddable factory is used to create visualizations with PromQL queries.
 * These visualizations are rendered inline and support time range filtering.
 */
export const useEmbeddable = () => {
  const createPromQLEmbeddable = useCallback(
    ({
      promqlQuery,
      prometheusConnectionId,
      timeRange,
      title,
      chartType = 'line',
    }: CreateEmbeddableParams) => {
      if (!coreRefs.embeddable) {
        throw new Error('Embeddable plugin not available');
      }

      const factory = coreRefs.embeddable.getEmbeddableFactory('explore');

      if (!factory) {
        throw new Error('Explore embeddable factory not found');
      }

      // Input format based on visualizationFromPromethesMetric pattern
      const embeddableInput = {
        id: `apm-promql-${Date.now()}`,
        timeRange: {
          from: timeRange.from,
          to: timeRange.to,
        },
        attributes: {
          title,
          visualization: JSON.stringify({
            chartType,
            params: {
              addLegend: true,
              legendPosition: 'right',
              lineMode: 'straight',
              lineWidth: 2,
            },
            axesMapping: {
              x: 'Time',
              y: 'value',
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
                  title: `Prometheus ${prometheusConnectionId}`,
                  type: 'PROMETHEUS',
                  timeFieldName: 'Time',
                },
              },
              filter: [],
            }),
          },
        },
        references: [],
      };

      return factory.create(embeddableInput);
    },
    []
  );

  return {
    createPromQLEmbeddable,
  };
};
