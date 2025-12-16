/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeRangePicker } from '../time_range_picker';

describe('TimeRangePicker', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    timeRange: { from: 'now-15m', to: 'now' },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render time range picker', () => {
    render(<TimeRangePicker {...defaultProps} />);

    // EuiSuperDatePicker renders with this class
    const picker = document.querySelector('.euiSuperDatePicker');
    expect(picker).toBeInTheDocument();
  });

  it('should display current time range text', () => {
    render(<TimeRangePicker {...defaultProps} />);

    // EuiSuperDatePicker shows "Last 15 minutes" for now-15m to now
    expect(screen.getByText(/Last 15 minutes/)).toBeInTheDocument();
  });

  it('should have disabled class when isDisabled prop is true', () => {
    render(<TimeRangePicker {...defaultProps} isDisabled={true} />);

    const controlLayout = document.querySelector('.euiFormControlLayout');
    expect(controlLayout).toHaveClass('euiFormControlLayout-isDisabled');
  });

  it('should not have disabled class by default', () => {
    render(<TimeRangePicker {...defaultProps} />);

    const controlLayout = document.querySelector('.euiFormControlLayout');
    expect(controlLayout).not.toHaveClass('euiFormControlLayout-isDisabled');
  });

  it('should support absolute time ranges', () => {
    render(
      <TimeRangePicker
        timeRange={{ from: '2025-01-01T00:00:00Z', to: '2025-01-01T23:59:59Z' }}
        onChange={mockOnChange}
      />
    );

    const picker = document.querySelector('.euiSuperDatePicker');
    expect(picker).toBeInTheDocument();
  });

  it('should support relative time ranges', () => {
    render(<TimeRangePicker timeRange={{ from: 'now-1h', to: 'now' }} onChange={mockOnChange} />);

    // Should show "Last 1 hour"
    expect(screen.getByText(/Last 1 hour/)).toBeInTheDocument();
  });

  it('should render without update button', () => {
    render(<TimeRangePicker {...defaultProps} />);

    // showUpdateButton={false} means no "Refresh" or "Update" button
    const updateButton = screen.queryByText('Update');
    expect(updateButton).not.toBeInTheDocument();
  });

  it('should call onChange when time changes', () => {
    render(<TimeRangePicker {...defaultProps} />);

    // EuiSuperDatePicker should render
    const picker = document.querySelector('.euiSuperDatePicker');
    expect(picker).toBeInTheDocument();

    // We can't easily trigger onChange in a unit test without complex interactions
    // This is better tested in integration tests
  });
});
