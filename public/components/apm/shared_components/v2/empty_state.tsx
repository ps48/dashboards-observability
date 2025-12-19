/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  title: string;
  body: string;
  iconType?: string;
}

/**
 * OUI 2.0 Empty state component for no data scenarios
 *
 * Displays a centered message with optional icon, title, and body text
 * Used when there are no results to display or when an error occurs
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, iconType }) => {
  // Map EUI icon types to Unicode/Emoji equivalents
  const getIcon = () => {
    switch (iconType) {
      case 'search':
        return '🔍';
      case 'alert':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📭';
    }
  };

  return (
    <div className="oui:flex oui:flex-col oui:items-center oui:justify-center oui:py-12 oui:px-4">
      <div className="oui:text-6xl oui:mb-4">{getIcon()}</div>
      <h2 className="oui:text-xl oui:font-semibold oui:mb-2 oui:text-gray-900">
        {title}
      </h2>
      <p className="oui:text-sm oui:text-gray-600 oui:text-center oui:max-w-md">
        {body}
      </p>
    </div>
  );
};
