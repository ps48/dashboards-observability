/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { EmbeddableRenderer } from '../embeddable_renderer';

describe('EmbeddableRenderer', () => {
  let mockEmbeddable: any;
  let mockFactory: any;

  beforeEach(() => {
    mockEmbeddable = {
      render: jest.fn(),
      destroy: jest.fn(),
    };

    mockFactory = {
      create: jest.fn().mockResolvedValue(mockEmbeddable),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create and render embeddable', async () => {
    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    render(<EmbeddableRenderer factory={mockFactory} input={input} />);

    await waitFor(() => {
      expect(mockFactory.create).toHaveBeenCalledWith(input);
    });

    await waitFor(() => {
      expect(mockEmbeddable.render).toHaveBeenCalled();
    });
  });

  it('should destroy embeddable on unmount', async () => {
    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    const { unmount } = render(<EmbeddableRenderer factory={mockFactory} input={input} />);

    await waitFor(() => {
      expect(mockEmbeddable.render).toHaveBeenCalled();
    });

    unmount();

    expect(mockEmbeddable.destroy).toHaveBeenCalled();
  });

  it('should recreate embeddable when input changes', async () => {
    const input1 = {
      id: 'test-embeddable-1',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    const input2 = {
      id: 'test-embeddable-2',
      timeRange: { from: 'now-1h', to: 'now' },
    };

    const { rerender } = render(<EmbeddableRenderer factory={mockFactory} input={input1} />);

    await waitFor(() => {
      expect(mockFactory.create).toHaveBeenCalledWith(input1);
    });

    await waitFor(() => {
      expect(mockEmbeddable.render).toHaveBeenCalledTimes(1);
    });

    // Change input
    rerender(<EmbeddableRenderer factory={mockFactory} input={input2} />);

    await waitFor(() => {
      expect(mockEmbeddable.destroy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockFactory.create).toHaveBeenCalledWith(input2);
    });
  });

  it('should handle factory.create returning null', async () => {
    mockFactory.create.mockResolvedValue(null);

    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    render(<EmbeddableRenderer factory={mockFactory} input={input} />);

    await waitFor(() => {
      expect(mockFactory.create).toHaveBeenCalledWith(input);
    });

    // Should not call render when embeddable is null
    expect(mockEmbeddable.render).not.toHaveBeenCalled();
  });

  it('should handle embeddable creation error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFactory.create.mockRejectedValue(new Error('Creation failed'));

    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    render(<EmbeddableRenderer factory={mockFactory} input={input} />);

    await waitFor(() => {
      expect(mockFactory.create).toHaveBeenCalledWith(input);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[EmbeddableRenderer] Error creating/rendering embeddable:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle null factory gracefully', async () => {
    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    const { container } = render(<EmbeddableRenderer factory={null as any} input={input} />);

    // Should render empty div without throwing error
    expect(container.firstChild).toBeInTheDocument();
    expect(mockFactory.create).not.toHaveBeenCalled();
  });

  it('should render container div with correct styles', () => {
    const input = {
      id: 'test-embeddable',
      timeRange: { from: 'now-15m', to: 'now' },
    };

    const { container } = render(<EmbeddableRenderer factory={mockFactory} input={input} />);

    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv).toHaveStyle({
      width: '100%',
      height: '100%',
    });
  });
});
