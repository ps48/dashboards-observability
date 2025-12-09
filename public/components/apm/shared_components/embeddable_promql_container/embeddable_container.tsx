/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiPanel, EuiLoadingChart, EuiText, EuiSpacer } from '@elastic/eui';
import { useEmbeddable } from '../../utils/hooks/use_embeddable';
import { TimeRange } from '../../services/types';

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
  chartType = 'line',
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const embeddableRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { createPromQLEmbeddable } = useEmbeddable();

  useEffect(() => {
    const initEmbeddable = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Create embeddable
        const embeddable = createPromQLEmbeddable({
          promqlQuery,
          prometheusConnectionId,
          timeRange,
          title,
          chartType,
        });

        if (!embeddable) {
          throw new Error('Failed to create embeddable');
        }

        // Store reference for cleanup
        embeddableRef.current = embeddable;

        // Render embeddable
        await embeddable.render(containerRef.current);

        setIsLoading(false);
      } catch (err) {
        console.error('[EmbeddablePromQLContainer] Error creating embeddable:', err);
        setError(err.message || 'Failed to load visualization');
        setIsLoading(false);
      }
    };

    initEmbeddable();

    // Cleanup on unmount
    return () => {
      if (embeddableRef.current && embeddableRef.current.destroy) {
        embeddableRef.current.destroy();
        embeddableRef.current = null;
      }
    };
  }, [promqlQuery, prometheusConnectionId, timeRange, title, chartType, createPromQLEmbeddable]);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiText size="s">
        <h4>{title}</h4>
      </EuiText>
      <EuiSpacer size="s" />

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <EuiLoadingChart size="l" />
        </div>
      )}

      {error && (
        <EuiText color="danger" size="s">
          <p>{error}</p>
        </EuiText>
      )}

      <div
        ref={containerRef}
        style={{
          height: `${height}px`,
          display: isLoading || error ? 'none' : 'block',
        }}
        data-test-subj="embeddablePromqlContainer"
      />
    </EuiPanel>
  );
};
