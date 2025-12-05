/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyFilter } from './property_filter';
import { ServiceTableItem } from '../../services/types';

describe('PropertyFilter', () => {
  const mockItems: ServiceTableItem[] = [
    { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
    { serviceId: '2', serviceName: 'payment-service', environment: 'staging' },
    { serviceId: '3', serviceName: 'user-service', environment: 'production' },
  ];

  const mockOnFilteredItems = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText('Filter services by name or environment...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should call onFilteredItems with all items initially', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    expect(mockOnFilteredItems).toHaveBeenCalledWith(mockItems);
  });

  it('should filter items by service name', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText('Filter services by name or environment...');
    fireEvent.change(searchInput, { target: { value: 'auth' } });

    expect(mockOnFilteredItems).toHaveBeenCalledWith([mockItems[0]]);
  });

  it('should filter items by environment', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText('Filter services by name or environment...');
    fireEvent.change(searchInput, { target: { value: 'production' } });

    expect(mockOnFilteredItems).toHaveBeenCalledWith([mockItems[0], mockItems[2]]);
  });

  it('should be case insensitive', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText('Filter services by name or environment...');
    fireEvent.change(searchInput, { target: { value: 'PAYMENT' } });

    expect(mockOnFilteredItems).toHaveBeenCalledWith([mockItems[1]]);
  });

  it('should clear filter when cleared', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText(
      'Filter services by name or environment...'
    ) as HTMLInputElement;

    // Filter first
    fireEvent.change(searchInput, { target: { value: 'auth' } });
    expect(mockOnFilteredItems).toHaveBeenCalledWith([mockItems[0]]);

    // Clear filter
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(mockOnFilteredItems).toHaveBeenCalledWith(mockItems);
  });

  it('should return empty array when no matches', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByPlaceholderText('Filter services by name or environment...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(mockOnFilteredItems).toHaveBeenCalledWith([]);
  });

  it('should have accessible label', () => {
    render(<PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />);

    const searchInput = screen.getByLabelText('Filter services');
    expect(searchInput).toBeInTheDocument();
  });

  it('should update filtered items when items prop changes', () => {
    const { rerender } = render(
      <PropertyFilter items={mockItems} onFilteredItems={mockOnFilteredItems} />
    );

    const newItems: ServiceTableItem[] = [
      { serviceId: '4', serviceName: 'new-service', environment: 'test' },
    ];

    rerender(<PropertyFilter items={newItems} onFilteredItems={mockOnFilteredItems} />);

    expect(mockOnFilteredItems).toHaveBeenCalledWith(newItems);
  });
});
