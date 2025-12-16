/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISearchStart } from '../../../../../../src/plugins/data/public';
import { coreRefs } from '../../../../framework/core_refs';
import { PromQLQueryBuilder } from '../query_requests/promql_query_builder';
import { ExecuteMetricRequestParams } from '../../types/prometheus_types';
import { DEFAULT_OPENSEARCH_DATASOURCE_ID } from '../config';

/**
 * PromQLSearchService - Frontend service for executing PromQL queries via server API
 *
 * This service makes HTTP calls to the server-side APM API which handles
 * PromQL queries through the data plugin's search service. This avoids
 * authentication issues that occur when using the search strategy directly
 * from the client.
 *
 * Pattern: React Component → PromQLSearchService → Server API → Data Plugin Search → PromQL Strategy → Prometheus
 */
export class PromQLSearchService {
  constructor(
    private readonly searchService: ISearchStart,
    private readonly prometheusConnectionId: string
  ) {}

  /**
   * Execute a metric request (range query)
   */
  async executeMetricRequest(params: ExecuteMetricRequestParams): Promise<any> {
    const { query, startTime, endTime, step } = params;

    const requestBody = {
      query,
      prometheusConnectionName: this.prometheusConnectionId,
      opensearchDataSourceId: DEFAULT_OPENSEARCH_DATASOURCE_ID,
      timeRange: {
        from: new Date(startTime * 1000).toISOString(),
        to: new Date(endTime * 1000).toISOString(),
      },
      ...(step && { step }),
    };

    try {
      // Execute via server-side API which handles authentication
      const response = await coreRefs.http!.post('/api/apm/promql/query', {
        body: JSON.stringify(requestBody),
      });

      return response;
    } catch (error) {
      console.error('[PromQLSearchService] Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Build and execute a PromQL query using the query builder
   */
  async executeBuiltQuery(params: {
    metricName: string;
    filters: Record<string, string>;
    stat?: string;
    interval: string;
    startTime: number;
    endTime: number;
    step?: string;
  }): Promise<any> {
    const { metricName, filters, stat, interval, startTime, endTime, step } = params;

    // Build the PromQL query
    const query = PromQLQueryBuilder.buildQuery({
      metricName,
      filters,
      stat,
      interval,
    });

    // Execute the query
    return this.executeMetricRequest({
      query,
      startTime,
      endTime,
      step,
    });
  }
}
