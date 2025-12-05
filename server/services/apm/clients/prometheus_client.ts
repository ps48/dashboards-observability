/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '@osd/logging';
import { RequestHandlerContext } from '../../../../../../src/core/server';
import { ISearchStart } from '../../../../../../src/plugins/data/server';
import { ExecuteMetricRequestParams, PrometheusResponse } from '../types/prometheus_types';
import { PromQLQueryBuilder } from '../utils/promql_query_builder';

/**
 * PrometheusClient - Client for executing PromQL queries against Prometheus
 *
 * This client uses the PromQL search strategy from query enhancements plugin to query
 * Prometheus for APM metrics. It returns native Prometheus format responses.
 *
 * Key simplifications from AWS implementation:
 * - No CloudWatch format transformation
 * - Uses PromQL search strategy (promqlasync) from query enhancements
 * - Returns native Prometheus JSON responses
 * - No BaseClient interface
 */
export class PrometheusClient {
  constructor(
    private readonly logger: Logger,
    private readonly searchService: ISearchStart,
    private readonly prometheusConnectionId: string
  ) {}

  /**
   * Execute a PromQL metric request and return native Prometheus format
   *
   * This is used for data-driven UI (dependencies list, service details metrics, etc.)
   * For visualizations (charts, graphs), the UI should use explore embeddables directly.
   *
   * @param context - Request handler context
   * @param params - PromQL query parameters
   * @returns Native Prometheus response format
   */
  async executeMetricRequest(
    context: RequestHandlerContext,
    params: ExecuteMetricRequestParams
  ): Promise<PrometheusResponse> {
    const { query, startTime, endTime, step } = params;

    this.logger.info(`[executeMetricRequest] PromQL query: ${query}`);
    this.logger.info(`[executeMetricRequest] Time range: ${startTime} - ${endTime}, step: ${step}`);

    try {
      // Execute using PromQL search strategy
      // The promql strategy expects: { body: { query, timeRange, step } }
      const searchRequest = {
        body: {
          query: {
            query, // PromQL query string
            language: 'PROMQL',
            dataset: {
              id: this.prometheusConnectionId,
              title: `Prometheus connection ${this.prometheusConnectionId}`,
              type: 'PROMETHEUS',
              timeFieldName: 'Time',
            },
          },
          timeRange: {
            from: startTime,
            to: endTime,
          },
          ...(step && { step }), // Include step if provided
        },
      };

      const searchResponse = await this.searchService.search(context, searchRequest, {
        strategy: 'promql', // Use PromQL search strategy
      });

      this.logger.info('[executeMetricRequest] PromQL query executed successfully');
      this.logger.debug(`[executeMetricRequest] Response: ${JSON.stringify(searchResponse)}`);

      // Return native Prometheus format
      return searchResponse.rawResponse || searchResponse.body;
    } catch (error) {
      this.logger.error(`[executeMetricRequest] PromQL query execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build a PromQL query for common APM metrics
   *
   * This is a helper method for UI to construct queries.
   * UI can call this statically or build queries directly.
   *
   * @param params - Query parameters including metricName, serviceName, environment, operation, stat, interval
   * @returns PromQL query string
   */
  static buildMetricQuery(params: {
    metricName: string;
    serviceName: string;
    environment?: string;
    operation?: string;
    stat?: string;
    interval: string;
  }): string {
    const { metricName, serviceName, environment, operation, stat, interval } = params;

    // Build filters from individual parameters
    const filters: Record<string, string> = { serviceName };
    if (environment) filters.environment = environment;
    if (operation) filters.operation = operation;

    return PromQLQueryBuilder.buildQuery({ metricName, filters, stat, interval });
  }
}
