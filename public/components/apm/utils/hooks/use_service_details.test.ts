/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useServiceDetails } from './use_service_details';
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

describe('useServiceDetails', () => {
  const mockGetService = jest.fn();

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
      getService: mockGetService,
    }));
  });

  it('should fetch service details successfully', async () => {
    const mockServiceData = {
      Service: {
        KeyAttributes: {
          Name: 'payment-service',
          Environment: 'production',
          Type: 'SERVICE',
        },
      },
    };

    mockGetService.mockResolvedValue(mockServiceData);

    const { result, waitForNextUpdate } = renderHook(() => useServiceDetails(defaultParams));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      serviceName: 'payment-service',
      environment: 'production',
      type: 'SERVICE',
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle empty response', async () => {
    mockGetService.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() => useServiceDetails(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Service not found');
    mockGetService.mockRejectedValue(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useServiceDetails(defaultParams));

    await waitForNextUpdate();

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });

  it('should refetch data when refetch is called', async () => {
    mockGetService.mockResolvedValue({
      Service: {
        KeyAttributes: {
          Name: 'payment-service',
          Environment: 'production',
          Type: 'SERVICE',
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useServiceDetails(defaultParams));

    await waitForNextUpdate();

    expect(mockGetService).toHaveBeenCalledTimes(1);

    // Trigger refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockGetService).toHaveBeenCalledTimes(2);
  });

  it('should use default environment when not provided', async () => {
    mockGetService.mockResolvedValue({
      Service: {
        KeyAttributes: {
          Name: 'payment-service',
          Environment: 'unknown',
        },
      },
    });

    const paramsWithoutEnv = { ...defaultParams };
    delete paramsWithoutEnv.environment;

    const { waitForNextUpdate } = renderHook(() => useServiceDetails(paramsWithoutEnv));

    await waitForNextUpdate();

    expect(mockGetService).toHaveBeenCalledWith(
      expect.objectContaining({
        keyAttributes: expect.objectContaining({
          Environment: 'unknown',
        }),
      })
    );
  });

  it('should convert times to seconds', async () => {
    mockGetService.mockResolvedValue({
      Service: {
        KeyAttributes: {
          Name: 'payment-service',
          Environment: 'production',
        },
      },
    });

    const { waitForNextUpdate } = renderHook(() => useServiceDetails(defaultParams));

    await waitForNextUpdate();

    expect(mockGetService).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: 1735689600, // 2025-01-01T00:00:00Z in seconds
        endTime: 1735693200, // 2025-01-01T01:00:00Z in seconds
      })
    );
  });
});
