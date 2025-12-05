/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useApmApi } from './use_apm_api';

describe('useApmApi', () => {
  const mockHttp = {
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockResponse = { data: 'test' };
    mockHttp.post.mockResolvedValueOnce(mockResponse);

    const { result, waitForNextUpdate } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'listServices',
        params: { startTime: 1000, endTime: 2000 },
      })
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(mockHttp.post).toHaveBeenCalledWith('/api/observability/apm/resources', {
      body: JSON.stringify({
        connection: {
          id: 'default',
          type: 'DEFAULT_INDEX_PATTERNS',
        },
        operation: 'listServices',
        params: { startTime: 1000, endTime: 2000 },
      }),
    });
  });

  it('should handle errors', async () => {
    const mockError = new Error('API Error');
    mockHttp.post.mockRejectedValueOnce(mockError);

    const { result, waitForNextUpdate } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'listServices',
        params: {},
      })
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(mockError);
  });

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'listServices',
        params: {},
        enabled: false,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('should use custom connection config', async () => {
    const mockResponse = { data: 'test' };
    mockHttp.post.mockResolvedValueOnce(mockResponse);

    const customConnection = {
      id: 'prometheus-1',
      type: 'PROMETHEUS',
    };

    const { waitForNextUpdate } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'executeMetricRequest',
        params: { query: 'test' },
        connection: customConnection,
      })
    );

    await waitForNextUpdate();

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/api/observability/apm/resources',
      expect.objectContaining({
        body: expect.stringContaining('"id":"prometheus-1"'),
      })
    );
  });

  it('should support refetch', async () => {
    const mockResponse1 = { data: 'first' };
    const mockResponse2 = { data: 'second' };
    mockHttp.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

    const { result, waitForNextUpdate } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'listServices',
        params: {},
      })
    );

    await waitForNextUpdate();

    expect(result.current.data).toEqual(mockResponse1);

    // Trigger refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual(mockResponse2);
    expect(mockHttp.post).toHaveBeenCalledTimes(2);
  });

  it('should handle different operation types', async () => {
    const mockResponse = { metrics: [] };
    mockHttp.post.mockResolvedValueOnce(mockResponse);

    const { waitForNextUpdate } = renderHook(() =>
      useApmApi({
        http: mockHttp as any,
        operation: 'executeMetricRequest',
        params: { promqlQuery: 'up' },
      })
    );

    await waitForNextUpdate();

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/api/observability/apm/resources',
      expect.objectContaining({
        body: expect.stringContaining('"operation":"executeMetricRequest"'),
      })
    );
  });
});
