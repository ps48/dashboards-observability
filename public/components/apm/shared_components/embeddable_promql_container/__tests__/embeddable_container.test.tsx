/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmbeddablePromQLContainer } from '../embeddable_container';
import { coreRefs } from '../../../../../framework/core_refs';

// Mock core refs
jest.mock('../../../../../framework/core_refs', () => ({
  coreRefs: {
    embeddable: {
      getEmbeddableFactory: jest.fn(),
    },
  },
}));

// Mock EmbeddableRenderer
jest.mock('../../embeddable_renderer', () => ({
  EmbeddableRenderer: ({ factory, input }: any) => (
    <div data-test-subj="embeddable-renderer-mock">
      Embeddable Renderer Mock
      <div data-test-subj="factory-id">{factory ? 'factory-present' : 'no-factory'}</div>
      <div data-test-subj="input-id">{input?.id}</div>
    </div>
  ),
}));

describe('EmbeddablePromQLContainer', () => {
  const defaultProps = {
    promqlQuery: 'rate(http_requests_total[5m])',
    prometheusConnectionId: 'prometheus-1',
    timeRange: { from: 'now-15m', to: 'now' },
    title: 'Request Rate',
  };

  const mockFactory = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (coreRefs.embeddable?.getEmbeddableFactory as jest.Mock).mockReturnValue(mockFactory);
  });

  it('should render title', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(screen.getByText('Request Rate')).toBeInTheDocument();
  });

  it('should render EmbeddableRenderer when factory is available', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(screen.getByTestId('embeddable-renderer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('factory-id')).toHaveTextContent('factory-present');
  });

  it('should show error message when factory is not available', () => {
    (coreRefs.embeddable?.getEmbeddableFactory as jest.Mock).mockReturnValue(null);

    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(screen.getByText('Explore embeddable factory not available')).toBeInTheDocument();
    expect(screen.queryByTestId('embeddable-renderer-mock')).not.toBeInTheDocument();
  });

  it('should generate unique embeddable ID', () => {
    const { rerender } = render(<EmbeddablePromQLContainer {...defaultProps} />);
    const firstId = screen.getByTestId('input-id').textContent;

    // Re-render to get a new ID
    rerender(<EmbeddablePromQLContainer {...defaultProps} promqlQuery="up" />);
    const secondId = screen.getByTestId('input-id').textContent;

    expect(firstId).toMatch(/^apm-promql-/);
    expect(secondId).toMatch(/^apm-promql-/);
    expect(firstId).not.toBe(secondId);
  });

  it('should pass correct input to EmbeddableRenderer', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} chartType="bar" height={400} />);

    expect(screen.getByTestId('embeddable-renderer-mock')).toBeInTheDocument();
    // Input ID should be present
    expect(screen.getByTestId('input-id').textContent).toMatch(/^apm-promql-/);
  });

  it('should apply custom height', () => {
    const { container } = render(<EmbeddablePromQLContainer {...defaultProps} height={500} />);

    const heightDiv = container.querySelector('[style*="height: 500px"]');
    expect(heightDiv).toBeInTheDocument();
  });

  it('should use default chart type if not specified', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(screen.getByTestId('embeddable-renderer-mock')).toBeInTheDocument();
  });

  it('should call getEmbeddableFactory with correct type', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(coreRefs.embeddable?.getEmbeddableFactory).toHaveBeenCalledWith('explore');
  });
});
