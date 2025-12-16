/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISearchStart } from '../../../../../../src/plugins/data/public';
import {
  getQueryListServices,
  getQueryGetService,
  getQueryListServiceOperations,
  getQueryListServiceDependencies,
  getQueryGetServiceMap,
} from '../query_requests/ppl_queries';
import { ResponseProcessor } from '../query_requests/response_processor';
import { coreRefs } from '../../../../framework/core_refs';
import { DEFAULT_OPENSEARCH_DATASOURCE_ID } from '../config';
import {
  ListServicesRequest,
  GetServiceRequest,
  ListServiceOperationsRequest,
  ListServiceDependenciesRequest,
  GetServiceMapRequest,
} from '../../types/apm_types';

/**
 * PPLSearchService - Frontend service for executing PPL queries via server API
 *
 * This service makes HTTP calls to the server-side APM API which handles
 * PPL queries through the data plugin's search service. This ensures
 * consistent behavior with PromQL queries and proper authentication.
 *
 * Pattern: React Component → PPLSearchService → Server API → Data Plugin Search → PPL Strategy → OpenSearch
 */
export class PPLSearchService {
  constructor(private readonly searchService: ISearchStart) {}

  /**
   * List all services in the time range
   */
  async listServices(params: ListServicesRequest): Promise<any> {
    const { queryIndex, startTime, endTime } = params;

    const pplQuery = getQueryListServices(queryIndex || 'otel-apm-service-map', startTime, endTime);

    const searchResponse = await this.executePPLQuery(
      pplQuery,
      queryIndex || 'otel-apm-service-map'
    );

    // Transform the response
    const transformedResponse = ResponseProcessor.transformListServices(searchResponse);

    // Return the full transformed response including AvailableGroupByAttributes
    return transformedResponse;
  }

  /**
   * Get service details by keyAttributes
   */
  async getService(params: GetServiceRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = getQueryGetService(
      queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes?.Environment,
      keyAttributes?.Name
    );

    const searchResponse = await this.executePPLQuery(
      pplQuery,
      queryIndex || 'otel-apm-service-map'
    );

    // Transform the response
    return ResponseProcessor.transformGetService(searchResponse);
  }

  /**
   * List service operations for a given service
   */
  async listServiceOperations(params: ListServiceOperationsRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = getQueryListServiceOperations(
      queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes?.Environment,
      keyAttributes?.Name
    );

    const searchResponse = await this.executePPLQuery(
      pplQuery,
      queryIndex || 'otel-apm-service-map'
    );

    // Transform the response
    return ResponseProcessor.transformListServiceOperations(searchResponse);
  }

  /**
   * List service dependencies for a given service
   */
  async listServiceDependencies(params: ListServiceDependenciesRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = getQueryListServiceDependencies(
      queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes?.Environment,
      keyAttributes?.Name
    );

    const searchResponse = await this.executePPLQuery(
      pplQuery,
      queryIndex || 'otel-apm-service-map'
    );

    // Transform the response
    return ResponseProcessor.transformListServiceDependencies(searchResponse);
  }

  /**
   * Get service map (topology) data
   */
  async getServiceMap(params: GetServiceMapRequest): Promise<any> {
    const { queryIndex, startTime, endTime } = params;

    const pplQuery = getQueryGetServiceMap(
      queryIndex || 'otel-apm-service-map',
      startTime,
      endTime
    );

    const searchResponse = await this.executePPLQuery(
      pplQuery,
      queryIndex || 'otel-apm-service-map'
    );

    // Transform the response
    return ResponseProcessor.transformGetServiceMap(searchResponse);
  }

  /**
   * Execute an arbitrary PPL query
   *
   * Public method to execute any PPL query. Useful for custom queries
   * that don't fit the predefined methods.
   *
   * @param pplQuery The PPL query string
   * @param datasetId The dataset/index identifier (default: 'otel-apm-service-map')
   */
  async executeQuery(pplQuery: string, datasetId: string = 'otel-apm-service-map'): Promise<any> {
    return this.executePPLQuery(pplQuery, datasetId);
  }

  /**
   * Execute a PPL query via server-side API
   *
   * This method makes an HTTP call to the server-side APM API which executes
   * the query using the 'ppl' search strategy. This ensures consistent behavior
   * with PromQL queries and proper authentication.
   *
   * @param pplQuery The PPL query string
   * @param datasetId The dataset/index identifier (e.g., 'otel-apm-service-map')
   */
  private async executePPLQuery(pplQuery: string, datasetId: string): Promise<any> {
    const requestBody = {
      query: pplQuery,
      datasetId,
      opensearchDataSourceId: DEFAULT_OPENSEARCH_DATASOURCE_ID,
    };

    try {
      // Execute via server-side API which handles authentication
      const response = await coreRefs.http!.post('/api/apm/ppl/query', {
        body: JSON.stringify(requestBody),
      });

      return response;
    } catch (error) {
      console.error('[PPLSearchService] Query execution failed:', error);

      // Handle index not found / unauthorized errors more gracefully
      if (
        error.message?.includes('Unauthorized') ||
        error.message?.includes('index_not_found_exception') ||
        error.message?.includes('no such index')
      ) {
        console.warn(
          '[PPLSearchService] Index may not exist or user lacks permissions. Returning empty result.'
        );
        return {
          schema: [],
          datarows: [],
          size: 0,
        };
      }

      throw error;
    }
  }
}
