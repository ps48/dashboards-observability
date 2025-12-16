/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useServiceMetrics } from './use_service_metrics';
import { coreRefs } from '../../../../framework/core_refs';
import { PromQLSearchService } from '../search_strategy/promql_search_service';

// Mock coreRefs
jest.mock('../../../../framework/core_refs', () => ({
  coreRefs: {
    data: {
      search: {},
    },
  },
}));

// Mock PromQLSearchService
jest.mock('../search_strategy/promql_search_service');

describe('useServiceMetrics', () => {
  const mockExecuteMetricRequest = jest.fn();

  const defaultParams = {
    serviceName: 'payment-service',
    environment: 'production',
    startTime: new Date('2025-01-01T00:00:00Z'),
    endTime: new Date('2025-01-01T01:00:00Z'),
    metricType: 'rate' as const,
    prometheusConnectionId: 'prom-connection-1',
    step: '30s',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PromQLSearchService as jest.Mock).mockImplementation(() => ({
      executeMetricRequest: mockExecuteMetricRequest,
    }));
  });

  it('should fetch rate metrics successfully', async () => {
    const mockMetricData = {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { service_name: 'payment-service' },
            values: [
              [1735689600, '10.5'],
              [1735689630, '12.3'],
            ],
          },
        ],
      },
    };

    mockExecuteMetricRequest.mockResolvedValue(mockMetricData);

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
    expect(result.current.query).toContain('rate(http_server_requests_seconds_count');
    expect(result.current.query).toContain('service_name="payment-service"');
    expect(result.current.query).toContain('environment="production"');
  });

  it('should build correct query for error metrics', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const paramsWithErrors = { ...defaultParams, metricType: 'errors' as const };

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(paramsWithErrors));

    await waitForNextUpdate();

    expect(result.current.query).toContain('status=~"5.."');
    expect(result.current.query).toContain('sum(rate(');
  });

  it('should build correct query for duration metrics', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const paramsWithDuration = { ...defaultParams, metricType: 'duration' as const };

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(paramsWithDuration));

    await waitForNextUpdate();

    expect(result.current.query).toContain('histogram_quantile(0.95');
    expect(result.current.query).toContain('http_server_requests_seconds_bucket');
  });

  it('should handle empty response', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Prometheus unavailable');
    mockExecuteMetricRequest.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when refetch is called', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    await waitForNextUpdate();

    expect(mockExecuteMetricRequest).toHaveBeenCalledTimes(1);

    // Trigger refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockExecuteMetricRequest).toHaveBeenCalledTimes(2);
  });

  it('should omit environment from query when not provided', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const paramsWithoutEnv = { ...defaultParams };
    delete paramsWithoutEnv.environment;

    const { result, waitForNextUpdate } = renderHook(() => useServiceMetrics(paramsWithoutEnv));

    await waitForNextUpdate();

    expect(result.current.query).toContain('service_name="payment-service"');
    expect(result.current.query).not.toContain('environment=');
  });

  it('should convert times to seconds', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const { waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    await waitForNextUpdate();

    expect(mockExecuteMetricRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: 1735689600, // 2025-01-01T00:00:00Z in seconds
        endTime: 1735693200, // 2025-01-01T01:00:00Z in seconds
        step: '30s',
      })
    );
  });

  it('should use correct Prometheus connection ID', async () => {
    mockExecuteMetricRequest.mockResolvedValue({ data: { result: [] } });

    const { waitForNextUpdate } = renderHook(() => useServiceMetrics(defaultParams));

    await waitForNextUpdate();

    expect(PromQLSearchService).toHaveBeenCalledWith(coreRefs.data.search, 'prom-connection-1');
  });
});
