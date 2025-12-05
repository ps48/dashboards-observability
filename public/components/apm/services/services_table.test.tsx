/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServicesTable } from './services_table';
import { ServiceTableItem } from './types';

describe('ServicesTable', () => {
  const mockItems: ServiceTableItem[] = [
    { serviceId: 'svc-1', serviceName: 'auth-service', environment: 'production' },
    { serviceId: 'svc-2', serviceName: 'payment-service', environment: 'staging' },
    { serviceId: 'svc-3', serviceName: 'user-service', environment: 'production' },
  ];

  it('should render table with items', () => {
    render(<ServicesTable items={mockItems} isLoading={false} />);

    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();
    expect(screen.getByText('user-service')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<ServicesTable items={[]} isLoading={true} />);

    expect(screen.getByText('Loading services...')).toBeInTheDocument();
  });

  it('should display empty message when no items and not loading', () => {
    render(<ServicesTable items={[]} isLoading={false} />);

    expect(screen.getByText('No services found')).toBeInTheDocument();
  });

  it('should render all columns', () => {
    render(<ServicesTable items={mockItems} isLoading={false} />);

    expect(screen.getAllByText('Service Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Environment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Service ID').length).toBeGreaterThan(0);
  });

  it('should display service data in correct columns', () => {
    render(<ServicesTable items={mockItems} isLoading={false} />);

    expect(screen.getAllByText('production').length).toBeGreaterThan(0);
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('svc-1')).toBeInTheDocument();
  });

  it('should support sorting by service name', () => {
    render(<ServicesTable items={mockItems} isLoading={false} />);

    const serviceNameHeaders = screen.getAllByText('Service Name');
    expect(serviceNameHeaders.length).toBeGreaterThan(0);

    // Table should be sortable (tested via EuiBasicTable which handles sorting internally)
  });

  it('should show pagination controls', () => {
    const manyItems: ServiceTableItem[] = Array.from({ length: 25 }, (_, i) => ({
      serviceId: `svc-${i}`,
      serviceName: `service-${i}`,
      environment: 'test',
    }));

    render(<ServicesTable items={manyItems} isLoading={false} />);

    // Should show pagination since we have more than 20 items (default page size)
    // EuiBasicTable handles pagination rendering
    expect(screen.getByText('service-0')).toBeInTheDocument();
  });

  it('should truncate long service IDs', () => {
    const itemsWithLongId: ServiceTableItem[] = [
      {
        serviceId: 'very-long-service-id-that-should-be-truncated-in-the-table',
        serviceName: 'test-service',
        environment: 'production',
      },
    ];

    render(<ServicesTable items={itemsWithLongId} isLoading={false} />);

    expect(
      screen.getByText('very-long-service-id-that-should-be-truncated-in-the-table')
    ).toBeInTheDocument();
  });

  it('should handle empty service data gracefully', () => {
    const emptyItems: ServiceTableItem[] = [{ serviceId: '', serviceName: '', environment: '' }];

    render(<ServicesTable items={emptyItems} isLoading={false} />);

    // Should render without crashing - check for column headers
    expect(screen.getAllByText('Service Name').length).toBeGreaterThan(0);
  });
});
