/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceTableItem } from '../services/types';

/**
 * Transform raw PPL node response to ServiceTableItem
 * Handles response format from listServices API:
 * {
 *   KeyAttributes: { Name: string, Environment: string, Type: string },
 *   AttributeMaps: [...],
 *   GroupByAttributes: {...}
 * }
 */
export const transformNodeToServiceItem = (node: any): ServiceTableItem => {
  // New API format with KeyAttributes
  if (node.KeyAttributes) {
    const serviceName = node.KeyAttributes.Name || '';
    const environment = node.KeyAttributes.Environment || 'unknown';
    // Create serviceId from name + environment
    const serviceId = `${serviceName}::${environment}`;

    return {
      serviceId,
      serviceName,
      environment,
    };
  }

  // Legacy format fallback
  return {
    serviceId: node.id || node.serviceName || '',
    serviceName: node.serviceName || node.name || '',
    environment: node.environment || node.env || 'unknown',
  };
};

/**
 * Filter services by search query (service name or environment)
 */
export const filterServices = (items: ServiceTableItem[], query: string): ServiceTableItem[] => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.serviceName.toLowerCase().includes(lowerQuery) ||
      item.environment.toLowerCase().includes(lowerQuery)
  );
};
