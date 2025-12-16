/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServiceOverview } from '../service_overview';
import { useServiceDetails } from '../../../utils/hooks/use_service_details';

// Mock hooks
jest.mock('../../../utils/hooks/use_service_details');

// Mock embeddable components
jest.mock('../../../shared_components/embeddable_promql_container', () => ({
  EmbeddablePromQLContainer: () => (
    <div data-test-subj="mockEmbeddableChart">Mock Embeddable Chart</div>
  ),
}));

jest.mock('../../../shared_components/embeddable_metric_card', () => ({
  EmbeddableMetricCard: () => <div data-test-subj="mockEmbeddableCard">Mock Embeddable Card</div>,
}));

const mockUseServiceDetails = useServiceDetails as jest.MockedFunction<typeof useServiceDetails>;

describe('ServiceOverview', () => {
  const defaultProps = {
    serviceName: 'payment-service',
    environment: 'production',
    timeRange: { from: 'now-15m', to: 'now' },
    queryIndex: 'otel-apm-service-map',
    prometheusConnectionId: 'prom-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseServiceDetails.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseServiceDetails.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load service'),
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...defaultProps} />);

    expect(screen.getByText('Error loading service details')).toBeInTheDocument();
    expect(screen.getByText('Failed to load service')).toBeInTheDocument();
  });

  it('should render not found state', () => {
    mockUseServiceDetails.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...defaultProps} />);

    expect(screen.getByText('Service not found')).toBeInTheDocument();
    expect(screen.getByText(/No service found with name "payment-service"/)).toBeInTheDocument();
  });

  it('should render service details and embeddable metrics', () => {
    mockUseServiceDetails.mockReturnValue({
      data: {
        serviceName: 'payment-service',
        environment: 'production',
        type: 'SERVICE',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...defaultProps} />);

    expect(screen.getByTestId('serviceOverview')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();
    expect(screen.getByText(/Environment:/)).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText(/Type:/)).toBeInTheDocument();
    expect(screen.getByText('SERVICE')).toBeInTheDocument();
  });

  it('should render all metrics sections with embeddables', () => {
    mockUseServiceDetails.mockReturnValue({
      data: {
        serviceName: 'payment-service',
        environment: 'production',
        type: 'SERVICE',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...defaultProps} />);

    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();

    // Should render 5 metric cards
    const metricCards = screen.getAllByTestId('mockEmbeddableCard');
    expect(metricCards).toHaveLength(5);

    // Should render 4 line charts
    const lineCharts = screen.getAllByTestId('mockEmbeddableChart');
    expect(lineCharts).toHaveLength(4);
  });

  it('should render without environment', () => {
    const propsWithoutEnv = { ...defaultProps };
    delete propsWithoutEnv.environment;

    mockUseServiceDetails.mockReturnValue({
      data: {
        serviceName: 'payment-service',
        environment: 'unknown',
        type: 'SERVICE',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOverview {...propsWithoutEnv} />);

    expect(screen.getByText('payment-service')).toBeInTheDocument();
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
