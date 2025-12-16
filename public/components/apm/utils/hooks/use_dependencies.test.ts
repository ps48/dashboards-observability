/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useDependencies } from './use_dependencies';
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

describe('useDependencies', () => {
  const mockListServiceDependencies = jest.fn();

  const defaultParams = {
    serviceName: 'payment-service',
    environment: 'production',
    startTime: new Date('2025-01-01T00:00:00Z'),
    endTime: new Date('2025-01-01T01:00:00Z'),
    queryIndex: 'otel-apm-service-map',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PPLSearchService as jest.Mock).mockImplementation(() => ({
      listServiceDependencies: mockListServiceDependencies,
    }));
  });

  it('should fetch dependencies successfully', async () => {
    const mockDependenciesData = [
      {
        serviceName: 'auth-service',
        environment: 'production',
        type: 'upstream',
        callCount: '1500',
        errorRate: '0.01',
        avgLatency: '45.5',
      },
      {
        serviceName: 'database-service',
        environment: 'production',
        type: 'downstream',
        callCount: '3000',
        errorRate: '0.005',
        avgLatency: '12.3',
      },
    ];

    mockListServiceDependencies.mockResolvedValue(mockDependenciesData);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]).toEqual({
      serviceName: 'auth-service',
      environment: 'production',
      type: 'upstream',
      callCount: 1500,
      errorRate: 0.01,
      avgLatency: 45.5,
    });
    expect(result.current.data[1].type).toBe('downstream');
    expect(result.current.error).toBeNull();
  });

  it('should handle alternative field names in response', async () => {
    const mockDependenciesData = [
      {
        targetService: 'notification-service',
        environment: 'production',
        direction: 'downstream',
        callCount: '500',
      },
    ];

    mockListServiceDependencies.mockResolvedValue(mockDependenciesData);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].serviceName).toBe('notification-service');
    expect(result.current.data[0].type).toBe('downstream');
  });

  it('should handle empty response', async () => {
    mockListServiceDependencies.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch dependencies');
    mockListServiceDependencies.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when refetch is called', async () => {
    mockListServiceDependencies.mockResolvedValue([
      {
        serviceName: 'cache-service',
        environment: 'production',
        type: 'downstream',
        callCount: '10000',
      },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(mockListServiceDependencies).toHaveBeenCalledTimes(1);

    // Trigger refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockListServiceDependencies).toHaveBeenCalledTimes(2);
  });

  it('should use default environment when not provided', async () => {
    mockListServiceDependencies.mockResolvedValue([]);

    const paramsWithoutEnv = { ...defaultParams };
    delete paramsWithoutEnv.environment;

    const { waitForNextUpdate } = renderHook(() => useDependencies(paramsWithoutEnv));

    await waitForNextUpdate();

    expect(mockListServiceDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        keyAttributes: expect.objectContaining({
          Environment: 'unknown',
        }),
      })
    );
  });

  it('should convert times to seconds', async () => {
    mockListServiceDependencies.mockResolvedValue([]);

    const { waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(mockListServiceDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: 1735689600, // 2025-01-01T00:00:00Z in seconds
        endTime: 1735693200, // 2025-01-01T01:00:00Z in seconds
      })
    );
  });

  it('should handle missing optional fields gracefully', async () => {
    const mockDependenciesData = [
      {
        serviceName: 'minimal-service',
        environment: 'staging',
        type: 'upstream',
        callCount: '100',
        // Missing errorRate and avgLatency
      },
    ];

    mockListServiceDependencies.mockResolvedValue(mockDependenciesData);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0]).toEqual({
      serviceName: 'minimal-service',
      environment: 'staging',
      type: 'upstream',
      callCount: 100,
      errorRate: undefined,
      avgLatency: undefined,
    });
  });

  it('should handle unknown service name and environment', async () => {
    const mockDependenciesData = [
      {
        // Missing serviceName, targetService, environment, type, direction
        callCount: '50',
      },
    ];

    mockListServiceDependencies.mockResolvedValue(mockDependenciesData);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0]).toEqual({
      serviceName: 'unknown',
      environment: 'unknown',
      type: 'downstream',
      callCount: 50,
      errorRate: undefined,
      avgLatency: undefined,
    });
  });

  it('should handle both upstream and downstream dependencies', async () => {
    const mockDependenciesData = [
      {
        serviceName: 'api-gateway',
        environment: 'production',
        type: 'upstream',
        callCount: '2000',
      },
      {
        serviceName: 'analytics-service',
        environment: 'production',
        type: 'downstream',
        callCount: '800',
      },
      {
        serviceName: 'user-service',
        environment: 'production',
        type: 'downstream',
        callCount: '1200',
      },
    ];

    mockListServiceDependencies.mockResolvedValue(mockDependenciesData);

    const { result, waitForNextUpdate } = renderHook(() => useDependencies(defaultParams));

    await waitForNextUpdate();

    const upstreamDeps = result.current.data.filter((dep) => dep.type === 'upstream');
    const downstreamDeps = result.current.data.filter((dep) => dep.type === 'downstream');

    expect(upstreamDeps).toHaveLength(1);
    expect(downstreamDeps).toHaveLength(2);
  });
});
