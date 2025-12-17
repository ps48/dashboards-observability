/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { navigateToErrorTraces } from '../navigation_utils';
import { coreRefs } from '../../../../framework/core_refs';
import { DEFAULT_PPL_DATA_SOURCE_ID } from '../config';

// Mock the coreRefs module
jest.mock('../../../../framework/core_refs', () => ({
  coreRefs: {
    application: {
      navigateToApp: jest.fn(),
    },
  },
}));

describe('navigateToErrorTraces', () => {
  const mockNavigateToApp = coreRefs.application!.navigateToApp as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call navigateToApp with correct app ID', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      'explore',
      expect.objectContaining({
        path: expect.any(String),
      })
    );
  });

  it('should generate URL with correct RISON format matching expected structure', () => {
    const serviceName = 'checkout';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify the path structure
    expect(path).toMatch(/^traces\/#\/\?_g=\(.*\)&_q=\(.*\)$/);

    // Verify _g parameter structure (global state)
    expect(path).toContain(
      '_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))'
    );

    // Verify _q parameter contains key components
    expect(path).toContain('_q=(dataset:(dataSource:(id:');
    expect(path).toContain(
      "id:'6cfa38e0-d206-11f0-a7d0-65a8fe88d981::49e6bf8f-dfbd-4267-947b-a02c3bf9f3bd'"
    );
    expect(path).toContain('signalType:traces');
    expect(path).toContain('timeFieldName:startTime');
    expect(path).toContain("title:'otel-v1-apm-span-*'");
    expect(path).toContain('type:INDEX_PATTERN');
    expect(path).toContain('language:PPL');

    // Verify the query parameter contains encoded PPL query
    expect(path).toContain('query:');
    // Decode the query to verify content
    const queryMatch = path.match(/query:'([^']+)'/);
    expect(queryMatch).toBeTruthy();
    const decodedQuery = decodeURIComponent(queryMatch![1]);
    expect(decodedQuery).toBe('| where serviceName = "checkout" | where `status.code` > 0');
  });

  it('should encode special characters in PPL query', () => {
    const serviceName = 'my-service';
    const timeRange = { from: 'now-1h', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Extract and decode the query
    const queryMatch = path.match(/query:'([^']+)'/);
    expect(queryMatch).toBeTruthy();
    const decodedQuery = decodeURIComponent(queryMatch![1]);

    // Verify both conditions are in the query
    expect(decodedQuery).toContain('serviceName = "my-service"');
    expect(decodedQuery).toContain('`status.code` > 0');
  });

  it('should use correct time range in _g parameter without quotes', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-24h', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify time values don't have quotes (RISON format)
    expect(path).toContain('time:(from:now-24h,to:now)');
    expect(path).not.toContain("time:(from:'now-24h'");
  });

  it('should use correct dataSource configuration with all required fields', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify dataSource structure
    expect(path).toContain(`dataSource:(id:'${DEFAULT_PPL_DATA_SOURCE_ID}'`);
    expect(path).toContain('title:os-3.3');
    expect(path).toContain('type:OpenSearch');
    expect(path).toContain("version:'3.3.0')");
  });

  it('should use correct dataset ID format with index pattern UUID', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify dataset ID format: dataSourceId::indexPatternId
    expect(path).toContain(
      "id:'6cfa38e0-d206-11f0-a7d0-65a8fe88d981::49e6bf8f-dfbd-4267-947b-a02c3bf9f3bd'"
    );
  });

  it('should use empty array notation for schemaMappings', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify schemaMappings uses () not !()
    expect(path).toContain('schemaMappings:()');
    expect(path).not.toContain('schemaMappings:!()');
  });

  it('should use PPL language without format field', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Should have language:PPL
    expect(path).toContain('language:PPL');
    // Should NOT have format:jdbc
    expect(path).not.toContain('format:jdbc');
  });

  it('should have _g parameter before _q parameter', () => {
    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    // Verify _g comes before _q in the URL
    const gIndex = path.indexOf('_g=');
    const qIndex = path.indexOf('_q=');
    expect(gIndex).toBeLessThan(qIndex);
  });

  it('should handle service names with special characters', () => {
    const serviceName = 'test-service-with-dashes';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const path = callArgs[1].path;

    const queryMatch = path.match(/query:'([^']+)'/);
    const decodedQuery = decodeURIComponent(queryMatch![1]);
    expect(decodedQuery).toContain('serviceName = "test-service-with-dashes"');
  });

  it('should not call navigateToApp if coreRefs.application is undefined', () => {
    // Temporarily set application to undefined
    const originalApplication = coreRefs.application;
    coreRefs.application = undefined;

    const serviceName = 'test-service';
    const timeRange = { from: 'now-15m', to: 'now' };

    // Should not throw an error
    expect(() => navigateToErrorTraces(serviceName, timeRange)).not.toThrow();

    // navigateToApp should not have been called
    expect(mockNavigateToApp).not.toHaveBeenCalled();

    // Restore the original value
    coreRefs.application = originalApplication;
  });

  it('should match the exact expected URL format from the example', () => {
    const serviceName = 'checkout';
    const timeRange = { from: 'now-15m', to: 'now' };

    navigateToErrorTraces(serviceName, timeRange);

    const callArgs = mockNavigateToApp.mock.calls[0];
    const actualPath = callArgs[1].path;

    // Expected path structure (without the _a parameter which is added by the explore app)
    const expectedPathPattern = /^traces\/#\/\?_g=\(filters:!\(\),refreshInterval:\(pause:!t,value:0\),time:\(from:now-15m,to:now\)\)&_q=\(dataset:\(dataSource:\(id:'6cfa38e0-d206-11f0-a7d0-65a8fe88d981',title:os-3\.3,type:OpenSearch,version:'3\.3\.0'\),id:'6cfa38e0-d206-11f0-a7d0-65a8fe88d981::49e6bf8f-dfbd-4267-947b-a02c3bf9f3bd',schemaMappings:\(\),signalType:traces,timeFieldName:startTime,title:'otel-v1-apm-span-\*',type:INDEX_PATTERN\),language:PPL,query:'[^']+'\)$/;

    expect(actualPath).toMatch(expectedPathPattern);

    // Verify the query content specifically
    const queryMatch = actualPath.match(/query:'([^']+)'/);
    const decodedQuery = decodeURIComponent(queryMatch![1]);
    expect(decodedQuery).toBe('| where serviceName = "checkout" | where `status.code` > 0');
  });
});
