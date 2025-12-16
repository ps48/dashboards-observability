/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock hooks before imports
jest.mock('../../../utils/hooks/use_services');

// Mock FilterBar before imports
jest.mock('../../../shared_components/filter_bar', () => {
  const ReactMock = jest.requireActual('react');
  return {
    FilterBar: ({ items, onFilteredItems }: any) => {
      ReactMock.useEffect(() => {
        onFilteredItems(items);
      }, [items, onFilteredItems]);
      return ReactMock.createElement('div', { 'data-test-subj': 'mockFilterBar' });
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

import { Services } from '../services';
import { useServices } from '../../../utils/hooks/use_services';

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

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
    // EuiLoadingSpinner renders as a span with class, not with progressbar role
    const spinner = document.querySelector('.euiLoadingSpinner');
    expect(spinner).toBeInTheDocument();
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
      },
    ];

    mockUseServices.mockReturnValue({
      data: mockServices,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Services {...defaultProps} />);

    expect(screen.getByTestId('servicesPage')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByTestId('servicesTable')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();
  });
});
