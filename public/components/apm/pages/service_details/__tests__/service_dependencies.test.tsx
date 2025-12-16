/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServiceDependencies } from '../service_dependencies';
import { useDependencies } from '../../../utils/hooks/use_dependencies';

// Mock hooks
jest.mock('../../../utils/hooks/use_dependencies');

const mockUseDependencies = useDependencies as jest.MockedFunction<typeof useDependencies>;

describe('ServiceDependencies', () => {
  const defaultProps = {
    serviceName: 'payment-service',
    environment: 'production',
    timeRange: { from: 'now-15m', to: 'now' },
    queryIndex: 'otel-apm-service-map',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseDependencies.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseDependencies.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load dependencies'),
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('Error loading dependencies')).toBeInTheDocument();
    expect(screen.getByText('Failed to load dependencies')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    mockUseDependencies.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('No dependencies found')).toBeInTheDocument();
    expect(
      screen.getByText(/No dependency data available for service "payment-service"/)
    ).toBeInTheDocument();
  });

  it('should render upstream dependencies', () => {
    const mockDependencies = [
      {
        serviceName: 'auth-service',
        environment: 'production',
        type: 'upstream' as const,
        callCount: 1500,
        errorRate: 0.01,
        avgLatency: 45.5,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByTestId('serviceDependencies')).toBeInTheDocument();
    expect(screen.getByText('Upstream Dependencies')).toBeInTheDocument();
    expect(screen.getByTestId('upstreamDependenciesTable')).toBeInTheDocument();
    expect(screen.getByText('auth-service')).toBeInTheDocument();
  });

  it('should render downstream dependencies', () => {
    const mockDependencies = [
      {
        serviceName: 'database-service',
        environment: 'production',
        type: 'downstream' as const,
        callCount: 3000,
        errorRate: 0.005,
        avgLatency: 12.3,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('Downstream Dependencies')).toBeInTheDocument();
    expect(screen.getByTestId('downstreamDependenciesTable')).toBeInTheDocument();
    expect(screen.getByText('database-service')).toBeInTheDocument();
  });

  it('should render both upstream and downstream dependencies', () => {
    const mockDependencies = [
      {
        serviceName: 'auth-service',
        environment: 'production',
        type: 'upstream' as const,
        callCount: 1500,
        errorRate: 0.01,
        avgLatency: 45.5,
      },
      {
        serviceName: 'database-service',
        environment: 'production',
        type: 'downstream' as const,
        callCount: 3000,
        errorRate: 0.005,
        avgLatency: 12.3,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('Upstream Dependencies')).toBeInTheDocument();
    expect(screen.getByText('Downstream Dependencies')).toBeInTheDocument();
    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByText('database-service')).toBeInTheDocument();
  });

  it('should render dependency metrics correctly', () => {
    const mockDependencies = [
      {
        serviceName: 'cache-service',
        environment: 'production',
        type: 'downstream' as const,
        callCount: 10000,
        errorRate: 0.001,
        avgLatency: 5.2,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('10,000')).toBeInTheDocument(); // Call count
    expect(screen.getByText('0.10%')).toBeInTheDocument(); // Error rate
    expect(screen.getByText('5.20 ms')).toBeInTheDocument(); // Avg latency
  });

  it('should handle missing optional metrics', () => {
    const mockDependencies = [
      {
        serviceName: 'minimal-service',
        environment: 'staging',
        type: 'downstream' as const,
        callCount: 100,
        errorRate: undefined,
        avgLatency: undefined,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('minimal-service')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    // Should show "-" for missing metrics
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should render table headers', () => {
    mockUseDependencies.mockReturnValue({
      data: [
        {
          serviceName: 'test-service',
          environment: 'prod',
          type: 'upstream' as const,
          callCount: 100,
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...defaultProps} />);

    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
  });

  it('should render type badges correctly', () => {
    const mockDependencies = [
      {
        serviceName: 'upstream-service',
        environment: 'prod',
        type: 'upstream' as const,
        callCount: 100,
      },
      {
        serviceName: 'downstream-service',
        environment: 'prod',
        type: 'downstream' as const,
        callCount: 200,
      },
    ];

    mockUseDependencies.mockReturnValue({
      data: mockDependencies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<ServiceDependencies {...defaultProps} />);

    // Check for badge elements (EuiBadge renders with specific classes)
    const badges = container.querySelectorAll('[class*="Badge"]');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should render without environment', () => {
    const propsWithoutEnv = { ...defaultProps };
    delete propsWithoutEnv.environment;

    mockUseDependencies.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceDependencies {...propsWithoutEnv} />);

    expect(screen.getByText('No dependencies found')).toBeInTheDocument();
  });
});
