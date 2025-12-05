/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromQLQueryBuilder } from './promql_query_builder';

describe('PromQLQueryBuilder', () => {
  describe('buildFilters (private)', () => {
    it('should build label filter string with single filter', () => {
      const filters = { serviceName: 'my-service' };
      const result = PromQLQueryBuilder.buildFilters(filters);
      expect(result).toBe('{serviceName="my-service"}');
    });

    it('should build label filter string with multiple filters', () => {
      const filters = {
        serviceName: 'my-service',
        environment: 'prod',
        operation: 'GET /api',
      };
      const result = PromQLQueryBuilder.buildFilters(filters);
      expect(result).toBe('{serviceName="my-service",environment="prod",operation="GET /api"}');
    });

    it('should return empty string for empty filters', () => {
      const filters = {};
      const result = PromQLQueryBuilder.buildFilters(filters);
      expect(result).toBe('');
    });

    it('should handle special characters in label values', () => {
      const filters = { operation: 'GET /api/users/{id}' };
      const result = PromQLQueryBuilder.buildFilters(filters);
      expect(result).toBe('{operation="GET /api/users/{id}"}');
    });
  });

  describe('buildRateQuery', () => {
    it('should build rate query for error metric', () => {
      const result = PromQLQueryBuilder.buildRateQuery(
        'error',
        '{serviceName="my-service"}',
        '5m',
        'Sum'
      );
      expect(result).toBe('sum(rate(error{serviceName="my-service"}[5m]))');
    });

    it('should build rate query for fault metric', () => {
      const result = PromQLQueryBuilder.buildRateQuery(
        'fault',
        '{serviceName="my-service"}',
        '5m',
        'Average'
      );
      expect(result).toBe('avg(rate(fault{serviceName="my-service"}[5m]))');
    });

    it('should build rate query for request metric', () => {
      const result = PromQLQueryBuilder.buildRateQuery(
        'request',
        '{serviceName="my-service"}',
        '1m',
        'Sum'
      );
      expect(result).toBe('sum(rate(request{serviceName="my-service"}[1m]))');
    });

    it('should return base query for unknown stat', () => {
      const result = PromQLQueryBuilder.buildRateQuery(
        'error',
        '{serviceName="my-service"}',
        '5m',
        'Unknown'
      );
      expect(result).toBe('rate(error{serviceName="my-service"}[5m])');
    });

    it('should handle empty filter string', () => {
      const result = PromQLQueryBuilder.buildRateQuery('error', '', '5m', 'Sum');
      expect(result).toBe('sum(rate(error[5m]))');
    });
  });

  describe('buildLatencyQuery', () => {
    it('should build p50 latency query', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery(
        '{serviceName="my-service"}',
        '5m',
        'p50'
      );
      expect(result).toBe(
        'histogram_quantile(0.50, rate(latency_seconds_bucket{serviceName="my-service"}[5m]))'
      );
    });

    it('should build p90 latency query', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery(
        '{serviceName="my-service"}',
        '5m',
        'p90'
      );
      expect(result).toBe(
        'histogram_quantile(0.90, rate(latency_seconds_bucket{serviceName="my-service"}[5m]))'
      );
    });

    it('should build p99 latency query', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery(
        '{serviceName="my-service"}',
        '5m',
        'p99'
      );
      expect(result).toBe(
        'histogram_quantile(0.99, rate(latency_seconds_bucket{serviceName="my-service"}[5m]))'
      );
    });

    it('should default to average for unknown stat', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery(
        '{serviceName="my-service"}',
        '5m',
        'Unknown'
      );
      expect(result).toBe(
        'rate(latency_seconds_sum{serviceName="my-service"}[5m]) / rate(latency_seconds_count{serviceName="my-service"}[5m])'
      );
    });

    it('should handle empty filter string', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery('', '5m', 'p50');
      expect(result).toBe('histogram_quantile(0.50, rate(latency_seconds_bucket[5m]))');
    });

    it('should build average latency query when no stat provided', () => {
      const result = PromQLQueryBuilder.buildLatencyQuery('{serviceName="my-service"}', '5m');
      expect(result).toBe(
        'rate(latency_seconds_sum{serviceName="my-service"}[5m]) / rate(latency_seconds_count{serviceName="my-service"}[5m])'
      );
    });
  });

  describe('buildQuery', () => {
    it('should build error rate query', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'error',
        filters: { serviceName: 'my-service' },
        stat: 'Sum',
        interval: '5m',
      });
      expect(result).toBe('sum(rate(error{serviceName="my-service"}[5m]))');
    });

    it('should build fault rate query', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'fault',
        filters: { serviceName: 'my-service', environment: 'prod' },
        stat: 'Average',
        interval: '5m',
      });
      expect(result).toBe('avg(rate(fault{serviceName="my-service",environment="prod"}[5m]))');
    });

    it('should build request rate query', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'request',
        filters: { serviceName: 'my-service' },
        stat: 'Sum',
        interval: '1m',
      });
      expect(result).toBe('sum(rate(request{serviceName="my-service"}[1m]))');
    });

    it('should build latency query', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'latency',
        filters: { serviceName: 'my-service' },
        stat: 'p99',
        interval: '5m',
      });
      expect(result).toBe(
        'histogram_quantile(0.99, rate(latency_seconds_bucket{serviceName="my-service"}[5m]))'
      );
    });

    it('should build generic metric query', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'custom_metric',
        filters: { serviceName: 'my-service' },
        interval: '5m',
      });
      expect(result).toBe('custom_metric{serviceName="my-service"}');
    });

    it('should handle query without filters', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'error',
        filters: {},
        stat: 'Sum',
        interval: '5m',
      });
      expect(result).toBe('sum(rate(error[5m]))');
    });

    it('should use base rate query if stat not provided', () => {
      const result = PromQLQueryBuilder.buildQuery({
        metricName: 'error',
        filters: { serviceName: 'my-service' },
        interval: '5m',
      });
      expect(result).toBe('rate(error{serviceName="my-service"}[5m])');
    });
  });
});
