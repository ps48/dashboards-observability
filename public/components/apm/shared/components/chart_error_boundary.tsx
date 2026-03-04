/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@osd/i18n';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  height?: number;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary for chart components.
 * Catches render errors and displays a graceful fallback instead of crashing the page.
 */
export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ChartErrorBoundary] Chart render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: this.props.height || 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiIcon type="alert" size="l" color="danger" />
          <EuiText size="s">
            {i18n.translate('observability.apm.chartErrorBoundary.message', {
              defaultMessage: 'Chart failed to render',
            })}
          </EuiText>
        </div>
      );
    }

    return this.props.children;
  }
}
