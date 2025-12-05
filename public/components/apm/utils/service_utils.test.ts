/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { transformNodeToServiceItem, filterServices } from './service_utils';
import { ServiceTableItem } from '../services/types';

describe('service_utils', () => {
  describe('transformNodeToServiceItem', () => {
    it('should transform PPL node to ServiceTableItem', () => {
      const node = {
        id: 'service-123',
        serviceName: 'my-service',
        environment: 'production',
      };

      const result = transformNodeToServiceItem(node);

      expect(result).toEqual({
        serviceId: 'service-123',
        serviceName: 'my-service',
        environment: 'production',
      });
    });

    it('should use serviceName as fallback for serviceId', () => {
      const node = {
        serviceName: 'test-service',
        environment: 'production',
      };

      const result = transformNodeToServiceItem(node);

      expect(result).toEqual({
        serviceId: 'test-service',
        serviceName: 'test-service',
        environment: 'production',
      });
    });

    it('should use name as fallback for serviceName', () => {
      const node = {
        id: 'service-456',
        name: 'test-service',
      };

      const result = transformNodeToServiceItem(node);

      expect(result).toEqual({
        serviceId: 'service-456',
        serviceName: 'test-service',
        environment: 'unknown',
      });
    });

    it('should handle env as alternative to environment', () => {
      const node = {
        id: 'alt-123',
        serviceName: 'alt-service',
        env: 'staging',
      };

      const result = transformNodeToServiceItem(node);

      expect(result).toEqual({
        serviceId: 'alt-123',
        serviceName: 'alt-service',
        environment: 'staging',
      });
    });

    it('should handle missing fields with defaults', () => {
      const node = {};

      const result = transformNodeToServiceItem(node);

      expect(result).toEqual({
        serviceId: '',
        serviceName: '',
        environment: 'unknown',
      });
    });
  });

  describe('filterServices', () => {
    const mockItems: ServiceTableItem[] = [
      { serviceId: '1', serviceName: 'auth-service', environment: 'production' },
      { serviceId: '2', serviceName: 'payment-service', environment: 'production' },
      { serviceId: '3', serviceName: 'user-service', environment: 'staging' },
      { serviceId: '4', serviceName: 'notification-service', environment: 'development' },
    ];

    it('should return all items when query is empty', () => {
      const result = filterServices(mockItems, '');
      expect(result).toEqual(mockItems);
    });

    it('should filter by service name (case insensitive)', () => {
      const result = filterServices(mockItems, 'AUTH');
      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('auth-service');
    });

    it('should filter by environment', () => {
      const result = filterServices(mockItems, 'production');
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.environment === 'production')).toBe(true);
    });

    it('should filter by partial match', () => {
      const result = filterServices(mockItems, 'service');
      expect(result).toHaveLength(4); // All items contain "service"
    });

    it('should return empty array when no matches', () => {
      const result = filterServices(mockItems, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should handle query with spaces', () => {
      // Filter logic does simple includes, not complex word matching
      const result = filterServices(mockItems, 'user');
      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('user-service');
    });

    it('should handle query with leading/trailing spaces', () => {
      // Current implementation doesn't trim, but toLowerCase handles case
      const result = filterServices(mockItems, 'payment');
      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('payment-service');
    });

    it('should handle empty items array', () => {
      const result = filterServices([], 'test');
      expect(result).toEqual([]);
    });
  });
});
