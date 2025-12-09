/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EmbeddablePromQLContainer } from '../embeddable_container';
import * as useEmbeddableHook from '../../../utils/hooks/use_embeddable';

// Mock the useEmbeddable hook
jest.mock('../../../utils/hooks/use_embeddable');

describe('EmbeddablePromQLContainer', () => {
  let mockEmbeddable: any;
  let mockCreatePromQLEmbeddable: jest.Mock;

  const defaultProps = {
    promqlQuery: 'rate(http_requests_total[5m])',
    prometheusConnectionId: 'prometheus-1',
    timeRange: { from: 'now-15m', to: 'now' },
    title: 'Request Rate',
  };

  beforeEach(() => {
    mockEmbeddable = {
      render: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    };

    mockCreatePromQLEmbeddable = jest.fn().mockReturnValue(mockEmbeddable);

    (useEmbeddableHook.useEmbeddable as jest.Mock).mockReturnValue({
      createPromQLEmbeddable: mockCreatePromQLEmbeddable,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    expect(screen.getByText('Request Rate')).toBeInTheDocument();
    // EuiLoadingChart is present during loading
    const loadingElement = document.querySelector('.euiLoadingChart');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should create and render embeddable successfully', async () => {
    render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledWith({
        promqlQuery: 'rate(http_requests_total[5m])',
        prometheusConnectionId: 'prometheus-1',
        timeRange: { from: 'now-15m', to: 'now' },
        title: 'Request Rate',
        chartType: 'line',
      });
    });

    await waitFor(() => {
      expect(mockEmbeddable.render).toHaveBeenCalled();
    });

    // Container should be visible after loading
    const container = screen.getByTestId('embeddablePromqlContainer');
    expect(container).toHaveStyle({ display: 'block' });
  });

  it('should pass chartType prop to embeddable', async () => {
    render(<EmbeddablePromQLContainer {...defaultProps} chartType="bar" />);

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledWith(
        expect.objectContaining({
          chartType: 'bar',
        })
      );
    });
  });

  it('should use custom height', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} height={400} />);

    const container = screen.getByTestId('embeddablePromqlContainer');
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('should display error message when embeddable creation fails', async () => {
    mockCreatePromQLEmbeddable.mockImplementation(() => {
      throw new Error('Factory not found');
    });

    render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Factory not found')).toBeInTheDocument();
    });

    // Container should be hidden when error
    const container = screen.getByTestId('embeddablePromqlContainer');
    expect(container).toHaveStyle({ display: 'none' });
  });

  it('should display error message when embeddable render fails', async () => {
    mockEmbeddable.render.mockRejectedValue(new Error('Render failed'));

    render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Render failed')).toBeInTheDocument();
    });
  });

  it('should display generic error for unknown errors', async () => {
    mockCreatePromQLEmbeddable.mockImplementation(() => {
      throw new Error();
    });

    render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load visualization')).toBeInTheDocument();
    });
  });

  it('should destroy embeddable on unmount', async () => {
    const { unmount } = render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(mockEmbeddable.render).toHaveBeenCalled();
    });

    unmount();

    expect(mockEmbeddable.destroy).toHaveBeenCalled();
  });

  it('should recreate embeddable when props change', async () => {
    const { rerender } = render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledTimes(1);
    });

    // Change promqlQuery
    rerender(<EmbeddablePromQLContainer {...defaultProps} promqlQuery="up" />);

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledTimes(2);
      expect(mockEmbeddable.destroy).toHaveBeenCalled();
    });
  });

  it('should recreate embeddable when time range changes', async () => {
    const { rerender } = render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledTimes(1);
    });

    // Change time range
    rerender(
      <EmbeddablePromQLContainer {...defaultProps} timeRange={{ from: 'now-1h', to: 'now' }} />
    );

    await waitFor(() => {
      expect(mockCreatePromQLEmbeddable).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle embeddable without destroy method', async () => {
    const embeddableWithoutDestroy = {
      render: jest.fn().mockResolvedValue(undefined),
    };

    mockCreatePromQLEmbeddable.mockReturnValue(embeddableWithoutDestroy);

    const { unmount } = render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(embeddableWithoutDestroy.render).toHaveBeenCalled();
    });

    // Should not throw error when destroy is not available
    expect(() => unmount()).not.toThrow();
  });

  it('should render title in panel header', () => {
    render(<EmbeddablePromQLContainer {...defaultProps} title="Custom Title" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should not render embeddable when creation returns null', async () => {
    mockCreatePromQLEmbeddable.mockReturnValue(null);

    render(<EmbeddablePromQLContainer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create embeddable')).toBeInTheDocument();
    });
  });
});
