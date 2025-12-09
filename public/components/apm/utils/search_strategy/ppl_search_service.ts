/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISearchStart } from '../../../../../../src/plugins/data/public';
import { PPLQueryBuilder } from '../query_requests/ppl_query_builder';
import { ResponseProcessor } from '../query_requests/response_processor';
import {
  ListServicesRequest,
  GetServiceRequest,
  ListServiceOperationsRequest,
  ListServiceDependenciesRequest,
  GetServiceMapRequest,
} from '../../types/apm_types';

/**
 * PPLSearchService - Frontend service for executing PPL queries using search strategies
 *
 * This service uses the data plugin's search service with the 'ppl' search strategy.
 * Authentication is handled automatically via browser credentials.
 *
 * Pattern: React Component → PPLSearchService → Data Plugin Search → PPL Strategy → OpenSearch
 */
export class PPLSearchService {
  constructor(private readonly searchService: ISearchStart) {}

  /**
   * List all services in the time range
   */
  async listServices(params: ListServicesRequest): Promise<any> {
    const { queryIndex, startTime, endTime } = params;

    const pplQuery = PPLQueryBuilder.buildListServicesQuery({
      queryIndex: queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
    });

    const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
    const searchResponse = await this.executePPLQuery(searchRequest);

    // Transform the response - pplraw returns raw PPL response
    const services = ResponseProcessor.transformListServices(searchResponse);

    return services;
  }

  /**
   * Get service details by keyAttributes
   */
  async getService(params: GetServiceRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = PPLQueryBuilder.buildGetServiceQuery({
      queryIndex: queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes,
    });

    const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
    const searchResponse = await this.executePPLQuery(searchRequest);

    // Transform the response - pplraw returns raw PPL response
    return ResponseProcessor.transformGetService(searchResponse);
  }

  /**
   * List service operations for a given service
   */
  async listServiceOperations(params: ListServiceOperationsRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = PPLQueryBuilder.buildListServiceOperationsQuery({
      queryIndex: queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes,
    });

    const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
    const searchResponse = await this.executePPLQuery(searchRequest);

    // Transform the response - pplraw returns raw PPL response
    return ResponseProcessor.transformListServiceOperations(searchResponse);
  }

  /**
   * List service dependencies for a given service
   */
  async listServiceDependencies(params: ListServiceDependenciesRequest): Promise<any> {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    const pplQuery = PPLQueryBuilder.buildListServiceDependenciesQuery({
      queryIndex: queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
      keyAttributes,
    });

    const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
    const searchResponse = await this.executePPLQuery(searchRequest);

    // Transform the response - pplraw returns raw PPL response
    return ResponseProcessor.transformListServiceDependencies(searchResponse);
  }

  /**
   * Get service map (topology) data
   */
  async getServiceMap(params: GetServiceMapRequest): Promise<any> {
    const { queryIndex, startTime, endTime } = params;

    const pplQuery = PPLQueryBuilder.buildGetServiceMapQuery({
      queryIndex: queryIndex || 'otel-apm-service-map',
      startTime,
      endTime,
    });

    const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
    const searchResponse = await this.executePPLQuery(searchRequest);

    // Transform the response - pplraw returns raw PPL response
    return ResponseProcessor.transformGetServiceMap(searchResponse);
  }

  /**
   * Build search request for PPL Raw strategy
   *
   * @param pplQuery The PPL query string
   * @param datasetId The dataset/index identifier (e.g., 'otel-apm-service-map')
   *
   * The request format matches what ppl_raw_search_strategy expects:
   * - params.body contains the query
   * - format: 'jdbc' ensures proper response formatting
   */
  private buildSearchRequest(pplQuery: string, datasetId: string): any {
    return {
      params: {
        index: datasetId,
        body: {
          query: pplQuery,
          language: 'PPL',
          format: 'jdbc',
        },
      },
    };
  }

  /**
   * Execute a PPL query using the PPL Raw search strategy
   *
   * This method uses the data plugin's search service with the 'pplraw' strategy.
   * The 'pplraw' strategy is designed for direct use from the frontend and properly
   * handles authentication via the browser's HTTP request.
   */
  private async executePPLQuery(searchRequest: any): Promise<any> {
    try {
      // Execute using PPL Raw search strategy from frontend
      // The 'pplraw' strategy uses request.rawRequest for authentication
      // which is automatically provided by the browser
      const searchResponse = await this.searchService
        .search(searchRequest, {
          strategy: 'pplraw',
        })
        .toPromise();

      // pplraw returns { rawResponse } structure
      return searchResponse.rawResponse || searchResponse;
    } catch (error) {
      console.error('PPL Query execution failed:', error);

      // Handle index not found / unauthorized errors more gracefully
      if (
        error.message?.includes('Unauthorized') ||
        error.message?.includes('index_not_found_exception')
      ) {
        console.warn('Index may not exist or user lacks permissions. Returning empty result.');
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
