/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook } from '@testing-library/react-hooks';
import { useEmbeddable } from './use_embeddable';
import { coreRefs } from '../../../../framework/core_refs';

// Mock coreRefs
jest.mock('../../../../framework/core_refs', () => ({
  coreRefs: {
    embeddable: null,
  },
}));

describe('useEmbeddable', () => {
  let mockFactory: any;
  let mockEmbeddable: any;

  beforeEach(() => {
    mockEmbeddable = {
      render: jest.fn(),
      destroy: jest.fn(),
    };

    mockFactory = {
      create: jest.fn().mockReturnValue(mockEmbeddable),
    };

    (coreRefs as any).embeddable = {
      getEmbeddableFactory: jest.fn().mockReturnValue(mockFactory),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create PromQL embeddable with correct input', () => {
    const params = {
      promqlQuery: 'rate(http_requests_total[5m])',
      prometheusConnectionId: 'prometheus-1',
      timeRange: { from: 'now-15m', to: 'now' },
      title: 'Request Rate',
      chartType: 'line' as const,
    };

    const embeddable = result.current.createPromQLEmbeddable(params);

    expect(embeddable).toBe(mockEmbeddable);
    expect(coreRefs.embeddable.getEmbeddableFactory).toHaveBeenCalledWith('explore');
    expect(mockFactory.create).toHaveBeenCalled();

    const createCallArgs = mockFactory.create.mock.calls[0][0];
    expect(createCallArgs).toMatchObject({
      timeRange: { from: 'now-15m', to: 'now' },
      attributes: {
        title: 'Request Rate',
      },
    });

    // Verify query structure
    const searchSource = JSON.parse(
      createCallArgs.attributes.kibanaSavedObjectMeta.searchSourceJSON
    );
    expect(searchSource.query.query).toBe('rate(http_requests_total[5m])');
    expect(searchSource.query.language).toBe('PROMQL');
    expect(searchSource.query.dataset.id).toBe('prometheus-1');
    expect(searchSource.query.dataset.type).toBe('PROMETHEUS');
  });

  it('should use default chartType if not provided', () => {
    const { result } = renderHook(() => useEmbeddable());

    result.current.createPromQLEmbeddable({
      promqlQuery: 'up',
      prometheusConnectionId: 'prom-1',
      timeRange: { from: 'now-1h', to: 'now' },
      title: 'Uptime',
    });

    const createCallArgs = mockFactory.create.mock.calls[0][0];
    const visualization = JSON.parse(createCallArgs.attributes.visualization);
    expect(visualization.chartType).toBe('line');
  });

  it('should support different chart types', () => {
    const { result } = renderHook(() => useEmbeddable());

    const chartTypes: Array<'line' | 'bar' | 'area'> = ['line', 'bar', 'area'];

    chartTypes.forEach((chartType) => {
      mockFactory.create.mockClear();

      result.current.createPromQLEmbeddable({
        promqlQuery: 'up',
        prometheusConnectionId: 'prom-1',
        timeRange: { from: 'now-1h', to: 'now' },
        title: 'Test',
        chartType,
      });

      const createCallArgs = mockFactory.create.mock.calls[0][0];
      const visualization = JSON.parse(createCallArgs.attributes.visualization);
      expect(visualization.chartType).toBe(chartType);
    });
  });

  it('should throw error when embeddable plugin not available', () => {
    (coreRefs as any).embeddable = null;

    const { result } = renderHook(() => useEmbeddable());

    expect(() =>
      result.current.createPromQLEmbeddable({
        promqlQuery: 'up',
        prometheusConnectionId: 'prom-1',
        timeRange: { from: 'now-1h', to: 'now' },
        title: 'Test',
      })
    ).toThrow('Embeddable plugin not available');
  });

  it('should throw error when explore factory not found', () => {
    (coreRefs as any).embeddable = {
      getEmbeddableFactory: jest.fn().mockReturnValue(null),
    };

    const { result } = renderHook(() => useEmbeddable());

    expect(() =>
      result.current.createPromQLEmbeddable({
        promqlQuery: 'up',
        prometheusConnectionId: 'prom-1',
        timeRange: { from: 'now-1h', to: 'now' },
        title: 'Test',
      })
    ).toThrow('Explore embeddable factory not found');
  });

  it('should include visualization parameters', () => {
    const { result } = renderHook(() => useEmbeddable());

    result.current.createPromQLEmbeddable({
      promqlQuery: 'up',
      prometheusConnectionId: 'prom-1',
      timeRange: { from: 'now-1h', to: 'now' },
      title: 'Test',
    });

    const createCallArgs = mockFactory.create.mock.calls[0][0];
    const visualization = JSON.parse(createCallArgs.attributes.visualization);

    expect(visualization.params).toMatchObject({
      addLegend: true,
      legendPosition: 'right',
      lineMode: 'straight',
      lineWidth: 2,
    });

    expect(visualization.axesMapping).toMatchObject({
      x: 'Time',
      y: 'value',
    });
  });

  it('should generate unique embeddable IDs', () => {
    // Mock Date.now to return different values
    let mockTime = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockTime++);

    const id1 = mockFactory.create.mock.calls[0][0].id;
    const id2 = mockFactory.create.mock.calls[1][0].id;

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^apm-promql-\d+$/);
    expect(id2).toMatch(/^apm-promql-\d+$/);

    jest.restoreAllMocks();
  });
});
