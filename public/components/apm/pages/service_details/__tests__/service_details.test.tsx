/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServiceDetails } from '../service_details';

// Mock child components
jest.mock('../service_overview', () => ({
  ServiceOverview: () => <div data-test-subj="mockServiceOverview">Mock Overview</div>,
}));

jest.mock('../service_operations', () => ({
  ServiceOperations: () => <div data-test-subj="mockServiceOperations">Mock Operations</div>,
}));

jest.mock('../service_dependencies', () => ({
  ServiceDependencies: () => <div data-test-subj="mockServiceDependencies">Mock Dependencies</div>,
}));

jest.mock('../../../shared_components/time_filter/time_range_picker', () => ({
  TimeRangePicker: ({ onChange }: any) => (
    <button onClick={() => onChange({ from: 'now-1h', to: 'now' })}>Change Time</button>
  ),
}));

describe('ServiceDetails', () => {
  const defaultProps = {
    serviceName: 'payment-service',
    environment: 'production',
    queryIndex: 'otel-apm-service-map',
    prometheusConnectionId: 'prom-1',
  };

  it('should render with default overview tab', () => {
    render(<ServiceDetails {...defaultProps} />);

    expect(screen.getByTestId('serviceDetailsPage')).toBeInTheDocument();
    expect(screen.getByTestId('mockServiceOverview')).toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOperations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceDependencies')).not.toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<ServiceDetails {...defaultProps} />);

    expect(screen.getByTestId('serviceDetailsTab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('serviceDetailsTab-operations')).toBeInTheDocument();
    expect(screen.getByTestId('serviceDetailsTab-dependencies')).toBeInTheDocument();
  });

  it('should switch to operations tab when clicked', () => {
    render(<ServiceDetails {...defaultProps} />);

    const operationsTab = screen.getByTestId('serviceDetailsTab-operations');
    fireEvent.click(operationsTab);

    expect(screen.getByTestId('mockServiceOperations')).toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOverview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceDependencies')).not.toBeInTheDocument();
  });

  it('should switch to dependencies tab when clicked', () => {
    render(<ServiceDetails {...defaultProps} />);

    const dependenciesTab = screen.getByTestId('serviceDetailsTab-dependencies');
    fireEvent.click(dependenciesTab);

    expect(screen.getByTestId('mockServiceDependencies')).toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOverview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOperations')).not.toBeInTheDocument();
  });

  it('should render with initial tab set to operations', () => {
    render(<ServiceDetails {...defaultProps} initialTab="operations" />);

    expect(screen.getByTestId('mockServiceOperations')).toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOverview')).not.toBeInTheDocument();
  });

  it('should render with initial tab set to dependencies', () => {
    render(<ServiceDetails {...defaultProps} initialTab="dependencies" />);

    expect(screen.getByTestId('mockServiceDependencies')).toBeInTheDocument();
    expect(screen.queryByTestId('mockServiceOverview')).not.toBeInTheDocument();
  });

  it('should render back button when onBack is provided', () => {
    const onBack = jest.fn();
    render(<ServiceDetails {...defaultProps} onBack={onBack} />);

    const backButton = screen.getByTestId('serviceDetailsBackButton');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('Back to Services');
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = jest.fn();
    render(<ServiceDetails {...defaultProps} onBack={onBack} />);

    const backButton = screen.getByTestId('serviceDetailsBackButton');
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should not render back button when onBack is not provided', () => {
    render(<ServiceDetails {...defaultProps} />);

    expect(screen.queryByTestId('serviceDetailsBackButton')).not.toBeInTheDocument();
  });

  it('should render time range picker', () => {
    render(<ServiceDetails {...defaultProps} />);

    expect(screen.getByText('Change Time')).toBeInTheDocument();
  });

  it('should handle time range changes', () => {
    render(<ServiceDetails {...defaultProps} />);

    const changeButton = screen.getByText('Change Time');
    fireEvent.click(changeButton);

    // Component should re-render with new time range, but we don't assert on internal state
    // Just verify the component doesn't crash
    expect(screen.getByTestId('serviceDetailsPage')).toBeInTheDocument();
  });

  it('should render without environment', () => {
    const propsWithoutEnv = { ...defaultProps };
    delete propsWithoutEnv.environment;

    render(<ServiceDetails {...propsWithoutEnv} />);

    expect(screen.getByTestId('serviceDetailsPage')).toBeInTheDocument();
    expect(screen.getByTestId('mockServiceOverview')).toBeInTheDocument();
  });

  it('should switch between all tabs in sequence', () => {
    render(<ServiceDetails {...defaultProps} />);

    // Start with overview
    expect(screen.getByTestId('mockServiceOverview')).toBeInTheDocument();

    // Switch to operations
    fireEvent.click(screen.getByTestId('serviceDetailsTab-operations'));
    expect(screen.getByTestId('mockServiceOperations')).toBeInTheDocument();

    // Switch to dependencies
    fireEvent.click(screen.getByTestId('serviceDetailsTab-dependencies'));
    expect(screen.getByTestId('mockServiceDependencies')).toBeInTheDocument();

    // Switch back to overview
    fireEvent.click(screen.getByTestId('serviceDetailsTab-overview'));
    expect(screen.getByTestId('mockServiceOverview')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<ServiceDetails {...defaultProps} />);

    const overviewTab = screen.getByTestId('serviceDetailsTab-overview');
    const operationsTab = screen.getByTestId('serviceDetailsTab-operations');

    // Overview should be selected initially
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
    expect(operationsTab.getAttribute('aria-selected')).toBe('false');

    // Click operations
    fireEvent.click(operationsTab);

    // Operations should now be selected
    expect(overviewTab.getAttribute('aria-selected')).toBe('false');
    expect(operationsTab.getAttribute('aria-selected')).toBe('true');
  });
});
