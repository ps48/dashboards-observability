/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyFilter } from '../property_filter';
import { ServiceTableItem } from '../../../services/types';

describe('PropertyFilter', () => {
  const mockItems: ServiceTableItem[] = [
    { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
    { serviceId: '2', serviceName: 'payment-service', environment: 'production' },
    { serviceId: '3', serviceName: 'user-service', environment: 'staging' },
    { serviceId: '4', serviceName: 'notification-service', environment: 'development' },
  ];

  let onFilteredItems: jest.Mock;

  beforeEach(() => {
    onFilteredItems = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render search field', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');
    expect(searchField).toBeInTheDocument();
  });

  it('should call onFilteredItems with all items initially', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    expect(onFilteredItems).toHaveBeenCalledWith(mockItems);
  });

  it('should filter items by service name', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');

    fireEvent.change(searchField, { target: { value: 'auth' } });

    expect(onFilteredItems).toHaveBeenLastCalledWith([
      { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
    ]);
  });

  it('should filter items by environment', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');

    fireEvent.change(searchField, { target: { value: 'production' } });

    expect(onFilteredItems).toHaveBeenLastCalledWith([
      { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
      { serviceId: '2', serviceName: 'payment-service', environment: 'production' },
    ]);
  });

  it('should be case insensitive', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');

    fireEvent.change(searchField, { target: { value: 'AUTH' } });

    expect(onFilteredItems).toHaveBeenLastCalledWith([
      { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
    ]);
  });

  it('should return empty array when no matches', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');

    fireEvent.change(searchField, { target: { value: 'nonexistent' } });

    expect(onFilteredItems).toHaveBeenLastCalledWith([]);
  });

  it('should clear filter when cleared', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText(
      'Filter services by name or environment...'
    ) as HTMLInputElement;

    // Enter a filter
    fireEvent.change(searchField, { target: { value: 'auth' } });
    expect(onFilteredItems).toHaveBeenLastCalledWith([mockItems[0]]);

    // Clear the filter
    fireEvent.change(searchField, { target: { value: '' } });
    expect(onFilteredItems).toHaveBeenLastCalledWith(mockItems);
  });

  it('should update filtered items when items prop changes', () => {
    const { rerender } = render(
      <PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />
    );

    // Initial render
    expect(onFilteredItems).toHaveBeenCalledWith(mockItems);

    // Update items
    const newItems = mockItems.slice(0, 2);
    rerender(<PropertyFilter items={newItems} onFilteredItems={onFilteredItems} />);

    expect(onFilteredItems).toHaveBeenLastCalledWith(newItems);
  });

  it('should maintain filter when items change', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');

    // Set filter
    fireEvent.change(searchField, { target: { value: 'production' } });

    // Verify filter is still applied
    expect(onFilteredItems).toHaveBeenLastCalledWith([
      { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
      { serviceId: '2', serviceName: 'payment-service', environment: 'production' },
    ]);
  });

  it('should render with fullWidth prop', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByPlaceholderText('Filter services by name or environment...');
    expect(searchField.closest('.euiFieldSearch')).toBeInTheDocument();
  });

  it('should have aria-label for accessibility', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={onFilteredItems} />);

    const searchField = screen.getByLabelText('Filter services');
    expect(searchField).toBeInTheDocument();
  });
});
