/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useServices } from './use_services';
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

describe('useServices', () => {
  const mockListServices = jest.fn();

  const defaultParams = {
    startTime: new Date('2025-01-01T00:00:00Z'),
    endTime: new Date('2025-01-01T01:00:00Z'),
    queryIndex: 'otel-apm-service-map',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PPLSearchService as jest.Mock).mockImplementation(() => ({
      listServices: mockListServices,
    }));
  });

  it('should fetch services successfully', async () => {
    const mockServicesData = [
      {
        serviceName: 'payment-service',
        environment: 'production',
        serviceId: 'payment-service::production',
      },
      {
        serviceName: 'auth-service',
        environment: 'staging',
        serviceId: 'auth-service::staging',
      },
    ];

    mockListServices.mockResolvedValue(mockServicesData);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]).toEqual({
      serviceId: 'payment-service::production',
      serviceName: 'payment-service',
      environment: 'production',
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle empty response', async () => {
    mockListServices.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch services');
    mockListServices.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when refetch is called', async () => {
    mockListServices.mockResolvedValue([
      {
        serviceName: 'test-service',
        environment: 'prod',
      },
    ]);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(mockListServices).toHaveBeenCalledTimes(1);

    // Trigger refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockListServices).toHaveBeenCalledTimes(2);
  });

  it('should convert times to seconds', async () => {
    mockListServices.mockResolvedValue([]);

    const { waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(mockListServices).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: 1735689600, // 2025-01-01T00:00:00Z in seconds
        endTime: 1735693200, // 2025-01-01T01:00:00Z in seconds
      })
    );
  });

  it('should handle services without serviceId', async () => {
    const mockServicesData = [
      {
        serviceName: 'test-service',
        environment: 'production',
        // Missing serviceId
      },
    ];

    mockListServices.mockResolvedValue(mockServicesData);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].serviceId).toBe('test-service::production');
  });

  it('should handle services with missing environment', async () => {
    const mockServicesData = [
      {
        serviceName: 'test-service',
        // Missing environment
      },
    ];

    mockListServices.mockResolvedValue(mockServicesData);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].environment).toBe('unknown');
    expect(result.current.data[0].serviceId).toBe('test-service::unknown');
  });

  it('should handle alternative field names', async () => {
    const mockServicesData = [
      {
        name: 'alt-service', // Using 'name' instead of 'serviceName'
        environment: 'prod',
      },
    ];

    mockListServices.mockResolvedValue(mockServicesData);

    const { result, waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data[0].serviceName).toBe('alt-service');
  });

  it('should filter by environment when provided', async () => {
    mockListServices.mockResolvedValue([]);

    const paramsWithEnv = {
      ...defaultParams,
      environment: 'production',
    };

    const { waitForNextUpdate } = renderHook(() => useServices(paramsWithEnv));

    await waitForNextUpdate();

    expect(mockListServices).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
      })
    );
  });

  it('should not include environment filter when not provided', async () => {
    mockListServices.mockResolvedValue([]);

    const { waitForNextUpdate } = renderHook(() => useServices(defaultParams));

    await waitForNextUpdate();

    expect(mockListServices).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: undefined,
      })
    );
  });
});
