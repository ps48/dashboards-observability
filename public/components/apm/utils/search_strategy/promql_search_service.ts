/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISearchStart } from '../../../../../../src/plugins/data/public';
import { PromQLQueryBuilder } from '../query_requests/promql_query_builder';
import { ExecuteMetricRequestParams } from '../../types/prometheus_types';

/**
 * PromQLSearchService - Frontend service for executing PromQL queries using search strategies
 *
 * This service uses the data plugin's search service with the 'promql' search strategy.
 * Authentication is handled automatically via browser credentials.
 *
 * Pattern: React Component → PromQLSearchService → Data Plugin Search → PromQL Strategy → Prometheus
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

    const searchRequest = {
      body: {
        query: {
          query,
          language: 'PROMQL',
          dataset: {
            id: this.prometheusConnectionId,
            title: `Prometheus connection ${this.prometheusConnectionId}`,
            type: 'PROMETHEUS',
          },
        },
        timeRange: {
          from: new Date(startTime * 1000).toISOString(),
          to: new Date(endTime * 1000).toISOString(),
        },
        ...(step && { step }),
      },
    };

    try {
      // Execute using PromQL search strategy from frontend
      // Browser automatically provides authentication credentials
      const searchResponse = await this.searchService
        .search(searchRequest, {
          strategy: 'promql',
        })
        .toPromise();

      // Return the raw response or body depending on the structure
      return searchResponse.rawResponse || searchResponse.body;
    } catch (error) {
      console.error('PromQL Query execution failed:', error);
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
