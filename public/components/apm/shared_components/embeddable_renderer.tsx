/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { EmbeddableFactory, IEmbeddable } from '../../../../../src/plugins/embeddable/public';

export interface EmbeddableRendererProps {
  factory: EmbeddableFactory;
  input: any;
}

/**
 * EmbeddableRenderer - Renders an embeddable from a factory and input
 *
 * This component handles the lifecycle of creating and rendering embeddables
 */
export const EmbeddableRenderer: React.FC<EmbeddableRendererProps> = ({ factory, input }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const embeddableRef = useRef<IEmbeddable | null>(null);

  useEffect(() => {
    let cancelled = false;

    const createAndRenderEmbeddable = async () => {
      if (!containerRef.current || !factory) return;

      try {
        // Create the embeddable
        const embeddable = await factory.create(input);

        if (cancelled || !embeddable) return;

        // Store reference
        embeddableRef.current = embeddable;

        // Render the embeddable
        if (containerRef.current) {
          embeddable.render(containerRef.current);
        }
      } catch (error) {
        console.error('[EmbeddableRenderer] Error creating/rendering embeddable:', error);
      }
    };

    createAndRenderEmbeddable();

    // Cleanup
    return () => {
      cancelled = true;
      if (embeddableRef.current) {
        embeddableRef.current.destroy();
        embeddableRef.current = null;
      }
    };
  }, [factory, input]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
