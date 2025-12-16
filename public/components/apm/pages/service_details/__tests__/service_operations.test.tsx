/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServiceOperations } from '../service_operations';
import { useOperations } from '../../../utils/hooks/use_operations';

// Mock hooks
jest.mock('../../../utils/hooks/use_operations');

const mockUseOperations = useOperations as jest.MockedFunction<typeof useOperations>;

describe('ServiceOperations', () => {
  const defaultProps = {
    serviceName: 'payment-service',
    environment: 'production',
    timeRange: { from: 'now-15m', to: 'now' },
    queryIndex: 'otel-apm-traces',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseOperations.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseOperations.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load operations'),
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByText('Error loading operations')).toBeInTheDocument();
    expect(screen.getByText('Failed to load operations')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    mockUseOperations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByText('No operations found')).toBeInTheDocument();
    expect(
      screen.getByText(/No operations data available for service "payment-service"/)
    ).toBeInTheDocument();
  });

  it('should render operations table', () => {
    const mockOperations = [
      {
        operationName: 'POST /payment',
        requestCount: 1500,
        errorRate: 0.02,
        avgDuration: 125.5,
        p95Duration: 250.0,
      },
      {
        operationName: 'GET /payment/:id',
        requestCount: 3200,
        errorRate: 0.01,
        avgDuration: 45.3,
        p95Duration: 100.0,
      },
    ];

    mockUseOperations.mockReturnValue({
      data: mockOperations,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByTestId('serviceOperations')).toBeInTheDocument();
    expect(screen.getByTestId('operationsTable')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('POST /payment')).toBeInTheDocument();
    expect(screen.getByText('GET /payment/:id')).toBeInTheDocument();
  });

  it('should render operation metrics correctly', () => {
    const mockOperations = [
      {
        operationName: 'POST /payment',
        requestCount: 1500,
        errorRate: 0.02,
        avgDuration: 125.5,
        p95Duration: 250.0,
      },
    ];

    mockUseOperations.mockReturnValue({
      data: mockOperations,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByText('1,500')).toBeInTheDocument(); // Request count
    expect(screen.getByText('2.00%')).toBeInTheDocument(); // Error rate
    expect(screen.getByText('125.50 ms')).toBeInTheDocument(); // Avg duration
    expect(screen.getByText('250.00 ms')).toBeInTheDocument(); // P95 duration
  });

  it('should render table headers', () => {
    mockUseOperations.mockReturnValue({
      data: [
        {
          operationName: 'GET /health',
          requestCount: 100,
          errorRate: 0.0,
          avgDuration: 5.0,
          p95Duration: 10.0,
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    expect(screen.getByText('P95 Duration')).toBeInTheDocument();
  });

  it('should handle high error rates with danger color', () => {
    const mockOperations = [
      {
        operationName: 'POST /failing-endpoint',
        requestCount: 100,
        errorRate: 0.1, // 10% - should be danger
        avgDuration: 50.0,
        p95Duration: 100.0,
      },
    ];

    mockUseOperations.mockReturnValue({
      data: mockOperations,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<ServiceOperations {...defaultProps} />);

    expect(screen.getByText('10.00%')).toBeInTheDocument();
    // Check for EuiHealth danger color class (this is implementation-specific)
    const healthElement = container.querySelector('[class*="danger"]');
    expect(healthElement).toBeInTheDocument();
  });

  it('should render without environment', () => {
    const propsWithoutEnv = { ...defaultProps };
    delete propsWithoutEnv.environment;

    mockUseOperations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ServiceOperations {...propsWithoutEnv} />);

    expect(screen.getByText('No operations found')).toBeInTheDocument();
  });
});
