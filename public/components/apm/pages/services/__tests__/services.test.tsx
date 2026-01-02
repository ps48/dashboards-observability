/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock hooks before imports
jest.mock('../../../utils/hooks/use_services');
jest.mock('../../../utils/hooks/use_services_red_metrics');

// Mock ApmPageHeader before imports
jest.mock('../../../shared_components/apm_page_header', () => {
  const ReactMock = jest.requireActual('react');
  return {
    ApmPageHeader: () => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockApmPageHeader' });
    },
  };
});

// Mock EmptyState before imports
jest.mock('../../../shared_components/empty_state', () => {
  const ReactMock = jest.requireActual('react');
  return {
    EmptyState: ({ title, body }: any) => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockEmptyState' }, [
        ReactMock.createElement('h2', { key: 'title' }, title),
        ReactMock.createElement('p', { key: 'body' }, body),
      ]);
    },
  };
});

// Mock Top Dependencies and Top Services components
jest.mock('../../../shared_components/top_dependencies_by_fault_rate', () => {
  const ReactMock = jest.requireActual('react');
  return {
    TopDependenciesByFaultRate: () => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockTopDependencies' });
    },
  };
});

jest.mock('../../../shared_components/top_services_by_fault_rate', () => {
  const ReactMock = jest.requireActual('react');
  return {
    TopServicesByFaultRate: () => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockTopServices' });
    },
  };
});

// Mock LanguageIcon
jest.mock('../../../shared_components/language_icon', () => {
  const ReactMock = jest.requireActual('react');
  return {
    LanguageIcon: () => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockLanguageIcon' });
    },
  };
});

// Mock MetricSparkline
jest.mock('../../../shared_components/metric_sparkline', () => {
  const ReactMock = jest.requireActual('react');
  return {
    MetricSparkline: () => {
      return ReactMock.createElement('div', { 'data-test-subj': 'mockMetricSparkline' });
    },
  };
});

// Mock navigation utilities
jest.mock('../../../utils/navigation_utils', () => ({
  navigateToServiceMap: jest.fn(),
  navigateToServiceLogs: jest.fn(),
  navigateToServiceTraces: jest.fn(),
}));

import { Services } from '../services';
import { useServices } from '../../../utils/hooks/use_services';
import { useServicesRedMetrics } from '../../../utils/hooks/use_services_red_metrics';

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseServicesRedMetrics = useServicesRedMetrics as jest.MockedFunction<
  typeof useServicesRedMetrics
>;

describe('Services', () => {
  const defaultProps = {
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
    parentBreadcrumb: {
      text: 'Observability',
      href: '#/',
    },
    queryIndex: 'otel-apm-service-map',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for RED metrics hook
    mockUseServicesRedMetrics.mockReturnValue({
      metricsMap: new Map(),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('should set breadcrumbs on mount', () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<Services {...defaultProps} />);

    expect(defaultProps.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      defaultProps.parentBreadcrumb,
      {
        text: 'Services',
        href: '#/services',
      },
    ]);
  });

  it('should render loading state', () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<Services {...defaultProps} />);

    expect(screen.getByTestId('servicesPage')).toBeInTheDocument();
    // During loading, the full page structure is rendered with ApmPageHeader
    expect(screen.getByTestId('mockApmPageHeader')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load services'),
      refetch: jest.fn(),
    });

    render(<Services {...defaultProps} />);

    expect(screen.getByText('Error loading services')).toBeInTheDocument();
    expect(screen.getByText('Failed to load services')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Services {...defaultProps} />);

    expect(screen.getByText('No services found')).toBeInTheDocument();
  });

  it('should render services table', () => {
    const mockServices = [
      {
        serviceId: 'payment-service::production',
        serviceName: 'payment-service',
        environment: 'production',
        groupByAttributes: {
          'telemetry.sdk.language': 'java',
        },
      },
    ];

    mockUseServices.mockReturnValue({
      data: mockServices,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      availableGroupByAttributes: {},
    });

    render(<Services {...defaultProps} />);

    expect(screen.getByTestId('servicesPage')).toBeInTheDocument();
    // ApmPageHeader is now used for time filter instead of FilterBar
    expect(screen.getByTestId('mockApmPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('servicesTable')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();
  });
});
