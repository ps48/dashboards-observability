/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmbeddableMetricCard } from '../embeddable_metric_card';
import { coreRefs } from '../../../../framework/core_refs';

// Mock core refs
jest.mock('../../../../framework/core_refs', () => ({
  coreRefs: {
    embeddable: {
      getEmbeddableFactory: jest.fn(),
    },
  },
}));

// Mock EmbeddableRenderer
jest.mock('../embeddable_renderer', () => ({
  EmbeddableRenderer: ({ factory, input }: any) => (
    <div data-test-subj="embeddable-renderer-mock">
      Embeddable Renderer Mock
      <div data-test-subj="factory-id">{factory ? 'factory-present' : 'no-factory'}</div>
      <div data-test-subj="input-id">{input?.id}</div>
    </div>
  ),
}));

describe('EmbeddableMetricCard', () => {
  const defaultProps = {
    promqlQuery: 'avg(request{service="frontend"})',
    prometheusConnectionId: 'prometheus-1',
    timeRange: { from: 'now-15m', to: 'now' },
    title: 'Request Count',
  };

  const mockFactory = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (coreRefs.embeddable?.getEmbeddableFactory as jest.Mock).mockReturnValue(mockFactory);
  });

  it('should render EmbeddableRenderer when factory is available', () => {
    render(<EmbeddableMetricCard {...defaultProps} />);

    expect(screen.getByTestId('embeddable-renderer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('factory-id')).toHaveTextContent('factory-present');
  });

  it('should show error message when factory is not available', () => {
    (coreRefs.embeddable?.getEmbeddableFactory as jest.Mock).mockReturnValue(null);

    render(<EmbeddableMetricCard {...defaultProps} />);

    expect(screen.getByText('Explore embeddable factory not available')).toBeInTheDocument();
    expect(screen.queryByTestId('embeddable-renderer-mock')).not.toBeInTheDocument();
  });

  it('should generate unique embeddable ID', () => {
    const { rerender } = render(<EmbeddableMetricCard {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    // Re-render to get a new ID
    rerender(<EmbeddableMetricCard {...defaultProps} promqlQuery="up" />);
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).toMatch(/^apm-metric-/);
    expect(secondId).toMatch(/^apm-metric-/);
    expect(firstId).not.toBe(secondId);
  });

  it('should apply custom height', () => {
    const { container } = render(<EmbeddableMetricCard {...defaultProps} height={200} />);

    const panel = container.querySelector('[style*="height: 200px"]');
    expect(panel).toBeInTheDocument();
  });

  it('should use default height when not specified', () => {
    const { container } = render(<EmbeddableMetricCard {...defaultProps} />);

    const panel = container.querySelector('[style*="height: 120px"]');
    expect(panel).toBeInTheDocument();
  });

  it('should call getEmbeddableFactory with correct type', () => {
    render(<EmbeddableMetricCard {...defaultProps} />);

    expect(coreRefs.embeddable?.getEmbeddableFactory).toHaveBeenCalledWith('explore');
  });

  it('should wrap content in EuiPanel', () => {
    const { container } = render(<EmbeddableMetricCard {...defaultProps} />);

    const panel = container.querySelector('.euiPanel');
    expect(panel).toBeInTheDocument();
  });

  it('should recreate embeddable when promqlQuery changes', () => {
    const { rerender } = render(<EmbeddableMetricCard {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    rerender(
      <EmbeddableMetricCard {...defaultProps} promqlQuery='avg(fault{service="frontend"})' />
    );
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).not.toBe(secondId);
  });

  it('should recreate embeddable when timeRange changes', () => {
    const { rerender } = render(<EmbeddableMetricCard {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    rerender(<EmbeddableMetricCard {...defaultProps} timeRange={{ from: 'now-1h', to: 'now' }} />);
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).not.toBe(secondId);
  });

  it('should recreate embeddable when title changes', () => {
    const { rerender } = render(<EmbeddableMetricCard {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    rerender(<EmbeddableMetricCard {...defaultProps} title="New Title" />);
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).not.toBe(secondId);
  });

  it('should recreate embeddable when prometheusConnectionId changes', () => {
    const { rerender } = render(<EmbeddableMetricCard {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    rerender(<EmbeddableMetricCard {...defaultProps} prometheusConnectionId="prometheus-2" />);
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).not.toBe(secondId);
  });
});
