/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerApmResourcesRoute } from './apm_resources';
import { IRouter, Logger, RequestHandlerContext } from '../../../../../src/core/server';
import { PPLClient } from '../services/apm/clients/ppl_client';
import { PrometheusClient } from '../services/apm/clients/prometheus_client';

describe('APM Resources Route', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: jest.Mocked<Logger>;
  let mockPPLClient: jest.Mocked<PPLClient>;
  let mockPrometheusClient: jest.Mocked<PrometheusClient>;
  let routeHandler: any;

  beforeEach(() => {
    mockRouter = {
      post: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      get: jest.fn(),
    } as any;

    mockPPLClient = {
      listServices: jest.fn(),
      getService: jest.fn(),
      listServiceOperations: jest.fn(),
      listServiceDependencies: jest.fn(),
      getServiceMap: jest.fn(),
    } as any;

    mockPrometheusClient = {
      executeMetricRequest: jest.fn(),
    } as any;

    registerApmResourcesRoute(mockRouter, mockLogger, mockPPLClient, mockPrometheusClient);

    // Extract the route handler
    routeHandler = mockRouter.post.mock.calls[0][1];
  });

  describe('Route registration', () => {
    it('should register POST route at /api/observability/apm/resources', () => {
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/observability/apm/resources',
        }),
        expect.any(Function)
      );
    });

    it('should register route with correct validation schema', () => {
      const routeConfig = mockRouter.post.mock.calls[0][0];

      expect(routeConfig.validate).toBeDefined();
      expect(routeConfig.validate.body).toBeDefined();
    });
  });

  describe('PPL operations', () => {
    it('should handle listServices operation', async () => {
      const mockResult = {
        ServiceSummaries: [],
        StartTime: 1704067200,
        EndTime: 1704070800,
        NextToken: null,
      };

      mockPPLClient.listServices.mockResolvedValue(mockResult);

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'ppl-connection', type: 'PPL' },
          operation: 'listServices',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockPPLClient.listServices).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T01:00:00Z',
          queryIndex: expect.any(String),
        })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle getService operation', async () => {
      const mockResult = {
        Service: {
          KeyAttributes: { name: 'my-service' },
        },
      };

      mockPPLClient.getService.mockResolvedValue(mockResult);

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'ppl-connection', type: 'PPL' },
          operation: 'getService',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
            keyAttributes: {
              name: 'my-service',
              environment: 'prod',
            },
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockPPLClient.getService).toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should inject queryIndex from mapping for PPL operations', async () => {
      mockPPLClient.listServiceOperations.mockResolvedValue({
        Operations: [],
        StartTime: 1704067200,
        EndTime: 1704070800,
      });

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'ppl-connection', type: 'PPL' },
          operation: 'listServiceOperations',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
            keyAttributes: {
              name: 'my-service',
            },
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockPPLClient.listServiceOperations).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          queryIndex: expect.any(String),
        })
      );
    });

    it('should use provided queryIndex if present', async () => {
      mockPPLClient.getServiceMap.mockResolvedValue({
        Nodes: [],
        Edges: [],
      });

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'ppl-connection', type: 'PPL' },
          operation: 'getServiceMap',
          params: {
            queryIndex: 'custom_index',
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockPPLClient.getServiceMap).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          queryIndex: 'custom_index',
        })
      );
    });
  });

  describe('Prometheus operations', () => {
    it('should handle executeMetricRequest operation', async () => {
      const mockResult = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [],
        },
      };

      mockPrometheusClient.executeMetricRequest.mockResolvedValue(mockResult);

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'prometheus-connection', type: 'PROMETHEUS' },
          operation: 'executeMetricRequest',
          params: {
            query: 'sum(rate(error_total[5m]))',
            startTime: 1704067200,
            endTime: 1704070800,
            step: '60s',
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockPrometheusClient.executeMetricRequest).toHaveBeenCalledWith(mockContext, {
        query: 'sum(rate(error_total[5m]))',
        startTime: 1704067200,
        endTime: 1704070800,
        step: '60s',
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });
  });

  describe('Error handling', () => {
    it('should handle unknown operation', async () => {
      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'unknownOperation',
          params: {},
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: expect.objectContaining({
          message: expect.stringContaining('Unknown operation'),
        }),
      });
    });

    it('should handle invalid PPL operation', async () => {
      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'invalidPPLOperation',
          params: {},
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
    });

    it('should handle errors from PPL client', async () => {
      mockPPLClient.listServices.mockRejectedValue(new Error('PPL query failed'));

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'listServices',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: expect.objectContaining({
          message: 'PPL query failed',
        }),
      });
    });

    it('should handle errors from Prometheus client', async () => {
      mockPrometheusClient.executeMetricRequest.mockRejectedValue(
        new Error('Prometheus query failed')
      );

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PROMETHEUS' },
          operation: 'executeMetricRequest',
          params: {
            query: 'invalid_query',
            startTime: 1704067200,
            endTime: 1704070800,
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalled();
    });

    it('should preserve error statusCode if provided', async () => {
      const customError = new Error('Custom error') as any;
      customError.statusCode = 404;
      mockPPLClient.getService.mockRejectedValue(customError);

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'getService',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
            keyAttributes: { name: 'non-existent' },
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: expect.any(Object),
      });
    });
  });

  describe('Logging', () => {
    it('should log operation name', async () => {
      mockPPLClient.listServices.mockResolvedValue({
        ServiceSummaries: [],
        StartTime: 1704067200,
        EndTime: 1704070800,
        NextToken: null,
      });

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'listServices',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation: listServices')
      );
    });

    it('should log params in debug mode', async () => {
      mockPPLClient.getService.mockResolvedValue({
        Service: {},
      });

      const mockContext = {} as RequestHandlerContext;
      const mockRequest = {
        body: {
          connection: { id: 'connection', type: 'PPL' },
          operation: 'getService',
          params: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T01:00:00Z',
            keyAttributes: { name: 'test' },
          },
        },
      };
      const mockResponse = {
        ok: jest.fn(),
        customError: jest.fn(),
      };

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Params:'));
    });
  });
});
