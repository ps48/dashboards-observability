/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { TimeRange } from '../../services/types';

interface EmbeddableFactoryStart {
  getEmbeddableFactory: (type: string) => any;
}

interface CreateEmbeddableParams {
  embeddable: EmbeddableFactoryStart;
  promqlQuery: string;
  prometheusConnectionId: string;
  timeRange: TimeRange;
  title: string;
  chartType?: 'line' | 'bar' | 'area';
}

/**
 * Hook for creating Vega embeddables with PromQL queries
 *
 * Based on user's pattern:
 * const factory = DepsStart.embeddable.getEmbeddableFactory('explore')!;
 */
export const useEmbeddable = () => {
  const createPromQLEmbeddable = useCallback(
    ({
      embeddable,
      promqlQuery,
      prometheusConnectionId,
      timeRange,
      title,
      chartType = 'line',
    }: CreateEmbeddableParams) => {
      console.log('[useEmbeddable] Creating PromQL embeddable', {
        promqlQuery,
        prometheusConnectionId,
        timeRange,
        title,
        chartType,
      });

      const factory = embeddable.getEmbeddableFactory('explore');

      if (!factory) {
        console.error('[useEmbeddable] Explore embeddable factory not found');
        throw new Error('Explore embeddable factory not found');
      }

      console.log('[useEmbeddable] Factory found:', !!factory);

      const promqlInput = {
        id: `apm-promql-${Date.now()}`,
        timeRange: { from: timeRange.from, to: timeRange.to },
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
          uiState: JSON.stringify({ activeTab: 'explore_visualization_tab' }),
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              query: {
                query: promqlQuery,
                language: 'PROMQL',
                dataset: {
                  id: prometheusConnectionId,
                  title: `Prometheus connection ${prometheusConnectionId}`,
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

      console.log('[useEmbeddable] Creating embeddable with input:', promqlInput);

      const embeddableInstance = factory.create(promqlInput);

      console.log('[useEmbeddable] Embeddable instance created:', !!embeddableInstance);

      return embeddableInstance;
    },
    []
  );

  return {
    createPromQLEmbeddable,
  };
};
