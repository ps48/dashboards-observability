/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FilterBar } from '../filter_bar';
import { ServiceTableItem } from '../../../services/types';

// Mock child components
jest.mock('../../property_filter', () => ({
  PropertyFilter: ({ items, _onFilteredItems }: any) => (
    <div data-test-subj="mockPropertyFilter">Property Filter ({items.length} items)</div>
  ),
}));

jest.mock('../../time_filter', () => ({
  TimeRangePicker: ({ timeRange, _onChange, isDisabled }: any) => (
    <div data-test-subj="mockTimeRangePicker" data-disabled={isDisabled}>
      Time Picker ({timeRange.from} to {timeRange.to})
    </div>
  ),
}));

describe('FilterBar', () => {
  const mockItems: ServiceTableItem[] = [
    { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
    { serviceId: '2', serviceName: 'payment-service', environment: 'production' },
  ];

  const mockOnFilteredItems = jest.fn();
  const mockOnTimeChange = jest.fn();

  const defaultProps = {
    items: mockItems,
    timeRange: { from: 'now-15m', to: 'now' },
    onFilteredItems: mockOnFilteredItems,
    onTimeChange: mockOnTimeChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter bar', () => {
    render(<FilterBar {...defaultProps} />);

    const filterBar = screen.getByTestId('apmFilterBar');
    expect(filterBar).toBeInTheDocument();
  });

  it('should render PropertyFilter component', () => {
    render(<FilterBar {...defaultProps} />);

    const propertyFilter = screen.getByTestId('mockPropertyFilter');
    expect(propertyFilter).toBeInTheDocument();
    expect(propertyFilter).toHaveTextContent('Property Filter (2 items)');
  });

  it('should render TimeRangePicker component', () => {
    render(<FilterBar {...defaultProps} />);

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toBeInTheDocument();
    expect(timePicker).toHaveTextContent('Time Picker (now-15m to now)');
  });

  it('should pass items to PropertyFilter', () => {
    render(<FilterBar {...defaultProps} />);

    const propertyFilter = screen.getByTestId('mockPropertyFilter');
    expect(propertyFilter).toHaveTextContent('2 items');
  });

  it('should pass timeRange to TimeRangePicker', () => {
    render(<FilterBar {...defaultProps} />);

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toHaveTextContent('now-15m to now');
  });

  it('should disable time picker when isTimePickerDisabled is true', () => {
    render(<FilterBar {...defaultProps} isTimePickerDisabled={true} />);

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toHaveAttribute('data-disabled', 'true');
  });

  it('should not disable time picker by default', () => {
    render(<FilterBar {...defaultProps} />);

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toHaveAttribute('data-disabled', 'false');
  });

  it('should render with horizontal flex layout', () => {
    render(<FilterBar {...defaultProps} />);

    const filterBar = screen.getByTestId('apmFilterBar');
    expect(filterBar).toHaveClass('euiFlexGroup');
  });

  it('should handle empty items array', () => {
    render(<FilterBar {...defaultProps} items={[]} />);

    const propertyFilter = screen.getByTestId('mockPropertyFilter');
    expect(propertyFilter).toHaveTextContent('0 items');
  });

  it('should handle absolute time ranges', () => {
    render(
      <FilterBar
        {...defaultProps}
        timeRange={{ from: '2025-01-01T00:00:00Z', to: '2025-01-01T23:59:59Z' }}
      />
    );

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toHaveTextContent('2025-01-01T00:00:00Z to 2025-01-01T23:59:59Z');
  });

  it('should handle different time range formats', () => {
    render(<FilterBar {...defaultProps} timeRange={{ from: 'now-1h', to: 'now' }} />);

    const timePicker = screen.getByTestId('mockTimeRangePicker');
    expect(timePicker).toHaveTextContent('now-1h to now');
  });
});
