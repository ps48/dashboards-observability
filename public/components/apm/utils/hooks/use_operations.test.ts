/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useOperations } from './use_operations';
import { PPLSearchService } from '../search_strategy/ppl_search_service';

// Mock coreRefs
jest.mock('../../../../framework/core_refs', () => ({
  coreRefs: {
    data: {
      search: {},
    },
  },
}));

// Mock PPLSearchService
jest.mock('../search_strategy/ppl_search_service');

describe('useOperations', () => {
  const mockListServiceOperations = jest.fn();

  const defaultParams = {
    serviceName: 'payment-service',
    environment: 'production',
    startTime: new Date('2025-01-01T00:00:00Z'),
    endTime: new Date('2025-01-01T01:00:00Z'),
    queryIndex: 'otel-apm-traces',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PPLSearchService as jest.Mock).mockImplementation(() => ({
      listServiceOperations: mockListServiceOperations,
    }));
  });

  it('should fetch operations successfully', async () => {
    const mockOperationsData = [
      {
        operationName: 'POST /payment',
        requestCount: '1500',
        errorRate: '0.02',
        avgDuration: '125.5',
        p95Duration: '250.0',
      },
      {
        operationName: 'GET /payment/:id',
        requestCount: '3200',
        errorRate: '0.01',
        avgDuration: '45.3',
        p95Duration: '100.0',
      },
    ];

    mockListServiceOperations.mockResolvedValue(mockOperationsData);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]).toEqual({
      operationName: 'POST /payment',
      requestCount: 1500,
      errorRate: 0.02,
      avgDuration: 125.5,
      p95Duration: 250.0,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle alternative field names in response', async () => {
    const mockOperationsData = [
      {
        operation: 'DELETE /payment/:id',
        requestCount: '100',
        errorRate: '0.05',
        avgDuration: '80.0',
        p95Duration: '150.0',
      },
    ];

    mockListServiceOperations.mockResolvedValue(mockOperationsData);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].operationName).toBe('DELETE /payment/:id');
  });

  it('should handle empty response', async () => {
    mockListServiceOperations.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch operations');
    mockListServiceOperations.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when refetch is called', async () => {
    mockListServiceOperations.mockResolvedValue([
      {
        operationName: 'GET /health',
        requestCount: '5000',
        errorRate: '0.0',
        avgDuration: '5.0',
        p95Duration: '10.0',
      },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(mockListServiceOperations).toHaveBeenCalledTimes(1);

    // Trigger refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockListServiceOperations).toHaveBeenCalledTimes(2);
  });

  it('should use default environment when not provided', async () => {
    mockListServiceOperations.mockResolvedValue([]);

    const paramsWithoutEnv = { ...defaultParams };
    delete paramsWithoutEnv.environment;

    const { waitForNextUpdate } = renderHook(() => useOperations(paramsWithoutEnv));

    await waitForNextUpdate();

    expect(mockListServiceOperations).toHaveBeenCalledWith(
      expect.objectContaining({
        keyAttributes: expect.objectContaining({
          Environment: 'unknown',
        }),
      })
    );
  });

  it('should convert times to seconds', async () => {
    mockListServiceOperations.mockResolvedValue([]);

    const { waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(mockListServiceOperations).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: 1735689600, // 2025-01-01T00:00:00Z in seconds
        endTime: 1735693200, // 2025-01-01T01:00:00Z in seconds
      })
    );
  });

  it('should handle missing metric fields gracefully', async () => {
    const mockOperationsData = [
      {
        operationName: 'POST /incomplete',
        // Missing requestCount, errorRate, avgDuration, p95Duration
      },
    ];

    mockListServiceOperations.mockResolvedValue(mockOperationsData);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0]).toEqual({
      operationName: 'POST /incomplete',
      requestCount: 0,
      errorRate: 0,
      avgDuration: 0,
      p95Duration: 0,
    });
  });

  it('should handle unknown operation name', async () => {
    const mockOperationsData = [
      {
        // Missing operationName and operation
        requestCount: '100',
        errorRate: '0.0',
        avgDuration: '50.0',
        p95Duration: '100.0',
      },
    ];

    mockListServiceOperations.mockResolvedValue(mockOperationsData);

    const { result, waitForNextUpdate } = renderHook(() => useOperations(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].operationName).toBe('unknown');
  });
});
