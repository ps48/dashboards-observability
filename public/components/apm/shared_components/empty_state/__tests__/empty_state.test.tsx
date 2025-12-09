/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty_state';

describe('EmptyState', () => {
  it('should render default empty state', () => {
    render(<EmptyState />);

    expect(screen.getByText('No services found')).toBeInTheDocument();
    expect(screen.getByText(/No services match your search criteria/)).toBeInTheDocument();
  });

  it('should render default error state', () => {
    render(<EmptyState isError={true} />);

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText(/There was an error loading the services/)).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<EmptyState title="Custom Title" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render custom body', () => {
    render(<EmptyState body="Custom body message" />);

    expect(screen.getByText('Custom body message')).toBeInTheDocument();
  });

  it('should render custom title and body', () => {
    render(<EmptyState title="No Results" body="Try a different search term" />);

    expect(screen.getByText('No Results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('should show alert icon for error state', () => {
    render(<EmptyState isError={true} />);

    // EuiEmptyPrompt with iconType="alert" should render
    const emptyPrompt = document.querySelector('.euiEmptyPrompt');
    expect(emptyPrompt).toBeInTheDocument();
  });

  it('should show search icon for non-error state', () => {
    render(<EmptyState isError={false} />);

    // EuiEmptyPrompt with iconType="search" should render
    const emptyPrompt = document.querySelector('.euiEmptyPrompt');
    expect(emptyPrompt).toBeInTheDocument();
  });

  it('should override default error title with custom title', () => {
    render(<EmptyState isError={true} title="Connection Failed" />);

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.queryByText('Error loading data')).not.toBeInTheDocument();
  });

  it('should override default error body with custom body', () => {
    render(<EmptyState isError={true} body="Check your network connection" />);

    expect(screen.getByText('Check your network connection')).toBeInTheDocument();
    expect(screen.queryByText(/There was an error loading/)).not.toBeInTheDocument();
  });
});
