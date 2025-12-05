/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  transposeDataFrame,
  extractTimeRange,
  parseEnvironmentType,
  buildAttributeMaps,
  transformListServicesResponse,
  transformGetServiceResponse,
  transformListServiceOperationsResponse,
  transformListServiceDependenciesResponse,
  transformGetServiceMapResponse,
  buildAvailableGroupByAttributes,
  PPLDataFrame,
} from './response_processor';

describe('ResponseProcessor', () => {
  describe('transposeDataFrame', () => {
    it('should transpose column-oriented data to row-oriented', () => {
      const dataFrame: PPLDataFrame = {
        schema: [],
        fields: [
          { name: 'serviceName', type: 'string', values: ['service1', 'service2'] },
          { name: 'count', type: 'integer', values: [10, 20] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 2,
        meta: {},
      };

      const result = transposeDataFrame(dataFrame);

      expect(result).toEqual([
        { serviceName: 'service1', count: 10 },
        { serviceName: 'service2', count: 20 },
      ]);
    });

    it('should return empty array for empty data frame', () => {
      const dataFrame: PPLDataFrame = {
        schema: [],
        fields: [],
        name: 'test',
        type: 'data_frame',
        size: 0,
        meta: {},
      };

      const result = transposeDataFrame(dataFrame);

      expect(result).toEqual([]);
    });
  });

  describe('extractTimeRange', () => {
    it('should extract time range from timestamps', () => {
      const timestamps = [1704067200, 1704070800, 1704074400];
      const result = extractTimeRange(timestamps);

      expect(result.StartTime).toBe(1704067200);
      expect(result.EndTime).toBe(1704074400);
    });

    it('should handle ISO string timestamps', () => {
      const timestamps = ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'];
      const result = extractTimeRange(timestamps);

      expect(result.StartTime).toBe(Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000));
      expect(result.EndTime).toBe(Math.floor(new Date('2024-01-01T01:00:00Z').getTime() / 1000));
    });

    it('should return current time for empty array', () => {
      const result = extractTimeRange([]);
      const now = Math.floor(Date.now() / 1000);

      expect(result.StartTime).toBeCloseTo(now, -1);
      expect(result.EndTime).toBeCloseTo(now, -1);
    });
  });

  describe('parseEnvironmentType', () => {
    it('should parse EKS environment', () => {
      const result = parseEnvironmentType('eks:demo-cluster/default');

      expect(result).toEqual({
        platform: 'eks',
        cluster: 'demo-cluster',
        namespace: 'default',
      });
    });

    it('should parse EC2 environment with ASG', () => {
      const result = parseEnvironmentType('ec2:my-asg');

      expect(result).toEqual({
        platform: 'ec2',
        autoScalingGroup: 'my-asg',
      });
    });

    it('should parse EC2 default environment', () => {
      const result = parseEnvironmentType('ec2:default');

      expect(result).toEqual({
        platform: 'ec2',
      });
    });

    it('should parse ECS environment', () => {
      const result = parseEnvironmentType('ecs:my-cluster');

      expect(result).toEqual({
        platform: 'ecs',
        cluster: 'my-cluster',
      });
    });

    it('should parse Lambda environment', () => {
      const result = parseEnvironmentType('lambda:default');

      expect(result).toEqual({
        platform: 'lambda',
      });
    });

    it('should parse generic environment', () => {
      const result = parseEnvironmentType('generic:default');

      expect(result).toEqual({
        platform: 'generic',
      });
    });

    it('should handle invalid environment string', () => {
      const result = parseEnvironmentType('invalid');

      expect(result).toEqual({
        platform: 'generic',
      });
    });
  });

  describe('buildAttributeMaps', () => {
    it('should build attribute map for EKS', () => {
      const result = buildAttributeMaps(
        'AWS::EKS',
        { platform: 'eks', cluster: 'demo', namespace: 'default' },
        'my-service'
      );

      expect(result).toEqual([
        {
          PlatformType: 'AWS::EKS',
          'EKS.Cluster': 'demo',
          'K8s.Namespace': 'default',
          'K8s.Workload': 'my-service',
        },
      ]);
    });

    it('should build attribute map for EC2 with ASG', () => {
      const result = buildAttributeMaps(
        'AWS::EC2',
        { platform: 'ec2', autoScalingGroup: 'my-asg' },
        'my-service'
      );

      expect(result).toEqual([
        {
          PlatformType: 'AWS::EC2',
          'EC2.AutoScalingGroup': 'my-asg',
        },
      ]);
    });

    it('should build attribute map for Lambda', () => {
      const result = buildAttributeMaps('AWS::Lambda', { platform: 'lambda' }, 'my-function');

      expect(result).toEqual([
        {
          PlatformType: 'AWS::Lambda',
          'Lambda.Function.Name': 'my-function',
        },
      ]);
    });

    it('should build attribute map for generic platform', () => {
      const result = buildAttributeMaps('Generic', { platform: 'generic' });

      expect(result).toEqual([
        {
          PlatformType: 'Generic',
        },
      ]);
    });
  });

  describe('buildAvailableGroupByAttributes', () => {
    it('should aggregate unique groupByAttributes', () => {
      const groupByAttributesArray = [
        { telemetry: { sdk: { language: 'python' } } },
        { telemetry: { sdk: { language: 'java' } } },
        { deployment: { environment: 'prod' } },
      ];

      const result = buildAvailableGroupByAttributes(groupByAttributesArray);

      expect(result).toEqual({
        'telemetry.sdk.language': ['java', 'python'],
        'deployment.environment': ['prod'],
      });
    });

    it('should handle empty array', () => {
      const result = buildAvailableGroupByAttributes([]);

      expect(result).toEqual({});
    });

    it('should flatten nested objects', () => {
      const groupByAttributesArray = [
        {
          a: {
            b: {
              c: 'value1',
            },
          },
        },
      ];

      const result = buildAvailableGroupByAttributes(groupByAttributesArray);

      expect(result).toEqual({
        'a.b.c': ['value1'],
      });
    });
  });

  describe('transformListServicesResponse', () => {
    it('should transform PPL response to ListServices format', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          { name: 'serviceName', type: 'string', values: ['service1', 'service2'] },
          { name: 'EnvironmentType', type: 'string', values: ['eks:demo/default', 'ec2:default'] },
          { name: 'PlatformType', type: 'string', values: ['AWS::EKS', 'AWS::EC2'] },
          { name: 'timestamp', type: 'long', values: [1704067200, 1704070800] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 2,
        meta: {},
      };

      const result = transformListServicesResponse(pplResponse);

      expect(result.ServiceSummaries).toHaveLength(2);
      expect(result.ServiceSummaries[0].KeyAttributes.Name).toBe('service1');
      expect(result.ServiceSummaries[1].KeyAttributes.Name).toBe('service2');
      expect(result.StartTime).toBe(1704067200);
      expect(result.EndTime).toBe(1704070800);
    });

    it('should deduplicate services', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'serviceName',
            type: 'string',
            values: ['service1', 'service1', 'service2'],
          },
          {
            name: 'EnvironmentType',
            type: 'string',
            values: ['eks:demo/default', 'eks:demo/default', 'ec2:default'],
          },
          {
            name: 'PlatformType',
            type: 'string',
            values: ['AWS::EKS', 'AWS::EKS', 'AWS::EC2'],
          },
          { name: 'timestamp', type: 'long', values: [1704067200, 1704067300, 1704067400] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 3,
        meta: {},
      };

      const result = transformListServicesResponse(pplResponse);

      expect(result.ServiceSummaries).toHaveLength(2);
    });
  });

  describe('transformGetServiceResponse', () => {
    it('should transform PPL response to GetService format', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'service.keyAttributes',
            type: 'object',
            values: [
              {
                name: 'my-service',
                environment: 'eks:demo/default',
                type: 'Service',
              },
            ],
          },
          {
            name: 'service.groupByAttributes',
            type: 'object',
            values: [{ telemetry: { sdk: { language: 'python' } } }],
          },
          { name: 'timestamp', type: 'long', values: [1704067200] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 1,
        meta: {},
      };

      const result = transformGetServiceResponse(pplResponse);

      expect(result.Service).toBeDefined();
      expect(result.Service.KeyAttributes.Name).toBe('my-service');
      expect(result.Service.KeyAttributes.Environment).toBe('eks:demo/default');
    });
  });

  describe('transformListServiceOperationsResponse', () => {
    it('should transform PPL response to operations format', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'operation.name',
            type: 'string',
            values: ['GET /api', 'POST /api', 'GET /api'],
          },
          { name: 'timestamp', type: 'long', values: [1704067200, 1704067300, 1704067400] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 3,
        meta: {},
      };

      const result = transformListServiceOperationsResponse(pplResponse);

      expect(result.Operations).toHaveLength(2);
      expect(result.Operations.find((op: any) => op.Name === 'GET /api').Count).toBe(2);
      expect(result.Operations.find((op: any) => op.Name === 'POST /api').Count).toBe(1);
    });
  });

  describe('transformListServiceDependenciesResponse', () => {
    it('should transform PPL response to dependencies format', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'operation.remoteService.keyAttributes',
            type: 'object',
            values: [{ name: 'db-service' }, { name: 'cache-service' }, { name: 'db-service' }],
          },
          { name: 'timestamp', type: 'long', values: [1704067200, 1704067300, 1704067400] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 3,
        meta: {},
      };

      const result = transformListServiceDependenciesResponse(pplResponse);

      expect(result.Dependencies).toHaveLength(2);
      expect(
        result.Dependencies.find((dep: any) => dep.DependencyName === 'db-service').CallCount
      ).toBe(2);
      expect(
        result.Dependencies.find((dep: any) => dep.DependencyName === 'cache-service').CallCount
      ).toBe(1);
    });
  });

  describe('transformGetServiceMapResponse', () => {
    it('should transform PPL response to service map format', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'service.keyAttributes',
            type: 'object',
            values: [
              { name: 'service1', environment: 'eks:demo/default' },
              { name: 'service2', environment: 'ec2:default' },
            ],
          },
          {
            name: 'remoteService.keyAttributes',
            type: 'object',
            values: [
              { name: 'service2', environment: 'ec2:default' },
              { name: 'service3', environment: 'lambda:default' },
            ],
          },
          {
            name: 'service.groupByAttributes',
            type: 'object',
            values: [{}, {}],
          },
          {
            name: 'remoteService.groupByAttributes',
            type: 'object',
            values: [{}, {}],
          },
          { name: 'timestamp', type: 'long', values: [1704067200, 1704067300] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 2,
        meta: {},
      };

      const result = transformGetServiceMapResponse(pplResponse);

      expect(result.Nodes).toHaveLength(3); // service1, service2, service3
      expect(result.Edges).toHaveLength(2);
      expect(result.Nodes[0].Type).toBe('AWS::CloudWatch::Service');
    });

    it('should build AvailableGroupByAttributes', () => {
      const pplResponse: PPLDataFrame = {
        schema: [],
        fields: [
          {
            name: 'service.keyAttributes',
            type: 'object',
            values: [{ name: 'service1', environment: 'eks:demo/default' }],
          },
          {
            name: 'remoteService.keyAttributes',
            type: 'object',
            values: [{ name: 'service2', environment: 'ec2:default' }],
          },
          {
            name: 'service.groupByAttributes',
            type: 'object',
            values: [{ telemetry: { sdk: { language: 'python' } } }],
          },
          {
            name: 'remoteService.groupByAttributes',
            type: 'object',
            values: [{ telemetry: { sdk: { language: 'java' } } }],
          },
          { name: 'timestamp', type: 'long', values: [1704067200] },
        ],
        name: 'test',
        type: 'data_frame',
        size: 1,
        meta: {},
      };

      const result = transformGetServiceMapResponse(pplResponse);

      expect(result.AvailableGroupByAttributes).toHaveProperty('telemetry.sdk.language');
      expect(result.AvailableGroupByAttributes['telemetry.sdk.language']).toEqual([
        'java',
        'python',
      ]);
    });
  });
});
