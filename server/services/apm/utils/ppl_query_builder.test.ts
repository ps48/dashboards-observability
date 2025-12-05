/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PPLQueryBuilder } from './ppl_query_builder';

describe('PPLQueryBuilder', () => {
  const mockStartTime = '2024-01-01T00:00:00Z';
  const mockEndTime = '2024-01-01T01:00:00Z';
  const mockQueryIndex = 'service_map_index';

  describe('buildTimeFilterClauseISO', () => {
    it('should build time filter clause with ISO timestamps', () => {
      const result = PPLQueryBuilder.buildTimeFilterClauseISO(mockStartTime, mockEndTime);
      expect(result).toBe(
        ` | where timestamp >= '${mockStartTime}' AND timestamp <= '${mockEndTime}'`
      );
    });
  });

  describe('buildTimeFilterClauseEpoch', () => {
    it('should build time filter clause with epoch timestamps', () => {
      const startEpoch = 1704067200;
      const endEpoch = 1704070800;
      const result = PPLQueryBuilder.buildTimeFilterClauseEpoch(startEpoch, endEpoch);
      expect(result).toBe(` | where timestamp >= ${startEpoch} AND timestamp <= ${endEpoch}`);
    });
  });

  describe('buildGetServiceQuery', () => {
    it('should build query with required parameters', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'eks:demo/default',
        },
      };

      const result = PPLQueryBuilder.buildGetServiceQuery(params);

      expect(result).toContain(`source=${mockQueryIndex}`);
      expect(result).toContain(`timestamp >= '${mockStartTime}'`);
      expect(result).toContain(`timestamp <= '${mockEndTime}'`);
      expect(result).toContain(`service.keyAttributes.name = 'my-service'`);
      expect(result).toContain(`service.keyAttributes.environment = 'eks:demo/default'`);
      expect(result).toContain(`eventType = 'ServiceOperationDetail'`);
      expect(result).toContain('fields service.keyAttributes, service.groupByAttributes');
    });

    it('should handle multiple key attributes', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'prod',
          type: 'Service',
        },
      };

      const result = PPLQueryBuilder.buildGetServiceQuery(params);

      expect(result).toContain(`service.keyAttributes.name = 'my-service'`);
      expect(result).toContain(`service.keyAttributes.environment = 'prod'`);
      expect(result).toContain(`service.keyAttributes.type = 'Service'`);
    });
  });

  describe('buildListServiceOperationsQuery', () => {
    it('should build query with required parameters', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'eks:demo/default',
        },
      };

      const result = PPLQueryBuilder.buildListServiceOperationsQuery(params);

      expect(result).toContain(`source=${mockQueryIndex}`);
      expect(result).toContain(`timestamp >= '${mockStartTime}'`);
      expect(result).toContain(`timestamp <= '${mockEndTime}'`);
      expect(result).toContain(`service.keyAttributes.name = 'my-service'`);
      expect(result).toContain(`service.keyAttributes.environment = 'eks:demo/default'`);
      expect(result).toContain(`eventType = 'ServiceOperationDetail'`);
      expect(result).toContain('fields operation.name, @timestamp, timestamp');
    });

    it('should apply maxResults limit', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'prod',
        },
        maxResults: 100,
      };

      const result = PPLQueryBuilder.buildListServiceOperationsQuery(params);

      expect(result).toContain('head 100');
    });
  });

  describe('buildListServiceDependenciesQuery', () => {
    it('should build query with required parameters', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'eks:demo/default',
        },
      };

      const result = PPLQueryBuilder.buildListServiceDependenciesQuery(params);

      expect(result).toContain(`source=${mockQueryIndex}`);
      expect(result).toContain(`timestamp >= '${mockStartTime}'`);
      expect(result).toContain(`timestamp <= '${mockEndTime}'`);
      expect(result).toContain(`service.keyAttributes.name = 'my-service'`);
      expect(result).toContain(`service.keyAttributes.environment = 'eks:demo/default'`);
      expect(result).toContain(`eventType = 'ServiceOperationDetail'`);
      expect(result).toContain(
        'fields operation.remoteService.keyAttributes, @timestamp, timestamp'
      );
    });

    it('should apply maxResults limit', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'prod',
        },
        maxResults: 50,
      };

      const result = PPLQueryBuilder.buildListServiceDependenciesQuery(params);

      expect(result).toContain('head 50');
    });
  });

  describe('buildGetServiceMapQuery', () => {
    it('should build query with required parameters', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
      };

      const result = PPLQueryBuilder.buildGetServiceMapQuery(params);

      expect(result).toContain(`source=${mockQueryIndex}`);
      expect(result).toContain(`timestamp >= '${mockStartTime}'`);
      expect(result).toContain(`timestamp <= '${mockEndTime}'`);
      expect(result).toContain(`eventType = 'ServiceOperationDetail'`);
      expect(result).toContain('service.keyAttributes');
      expect(result).toContain('service.groupByAttributes');
      expect(result).toContain('remoteService.keyAttributes');
      expect(result).toContain('remoteService.groupByAttributes');
    });

    it('should filter by keyAttributes if provided', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        keyAttributes: {
          name: 'my-service',
          environment: 'prod',
        },
      };

      const result = PPLQueryBuilder.buildGetServiceMapQuery(params);

      expect(result).toContain(`service.keyAttributes.name = 'my-service'`);
      expect(result).toContain(`service.keyAttributes.environment = 'prod'`);
    });

    it('should apply maxResults limit', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        maxResults: 200,
      };

      const result = PPLQueryBuilder.buildGetServiceMapQuery(params);

      expect(result).toContain('head 200');
    });
  });

  describe('buildListServicesQuery', () => {
    it('should build query with required parameters', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
      };

      const result = PPLQueryBuilder.buildListServicesQuery(params);

      expect(result).toContain(`source=${mockQueryIndex}`);
      expect(result).toContain(`timestamp >= '${mockStartTime}'`);
      expect(result).toContain(`timestamp <= '${mockEndTime}'`);
      expect(result).toContain(`eventType = 'ServiceOperationDetail'`);
      expect(result).toContain('dedup hashCode');
      expect(result).toContain('fields serviceName, EnvironmentType, PlatformType, timestamp');
    });

    it('should apply maxResults limit', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
        maxResults: 500,
      };

      const result = PPLQueryBuilder.buildListServicesQuery(params);

      expect(result).toContain('head 500');
    });

    it('should handle queries without maxResults', () => {
      const params = {
        queryIndex: mockQueryIndex,
        startTime: mockStartTime,
        endTime: mockEndTime,
      };

      const result = PPLQueryBuilder.buildListServicesQuery(params);

      expect(result).not.toContain('head');
    });
  });

  describe('timestamp conversion', () => {
    it('should handle ISO 8601 timestamps', () => {
      const isoStart = '2024-01-01T00:00:00.000Z';
      const isoEnd = '2024-01-01T23:59:59.999Z';

      const result = PPLQueryBuilder.buildTimeFilterClauseISO(isoStart, isoEnd);

      expect(result).toContain(isoStart);
      expect(result).toContain(isoEnd);
    });

    it('should handle Unix epoch timestamps', () => {
      const epochStart = 1704067200;
      const epochEnd = 1704153599;

      const result = PPLQueryBuilder.buildTimeFilterClauseEpoch(epochStart, epochEnd);

      expect(result).toContain(epochStart.toString());
      expect(result).toContain(epochEnd.toString());
    });
  });
});
