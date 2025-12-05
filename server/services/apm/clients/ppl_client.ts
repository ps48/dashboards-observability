/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '@osd/logging';
import { RequestHandlerContext } from '../../../../../../src/core/server';
import { PPLQueryBuilder } from '../utils/ppl_query_builder';
import { ResponseProcessor } from '../utils/response_processor';
import {
  ListServicesRequest,
  GetServiceRequest,
  ListServiceOperationsRequest,
  ListServiceDependenciesRequest,
  GetServiceMapRequest,
} from '../types/apm_types';
import { PPLFacet } from '../../facets/ppl_facet';

/**
 * PPLClient - Simplified client for executing PPL queries against OpenSearch
 *
 * This client queries OpenSearch indices for APM service topology data using PPL.
 * It uses the existing PPL facet from the observability plugin.
 *
 * Simplified from the original AWS implementation by removing:
 * - BaseClient interface inheritance
 * - ApmManager/ClientFactory dependencies
 * - Mock mode support (handled in tests)
 * - AWS-specific concepts
 */
export class PPLClient {
  constructor(private readonly logger: Logger, private readonly pplFacet: PPLFacet) {}

  /**
   * Get service details by keyAttributes
   */
  async getService(
    context: RequestHandlerContext,
    params: GetServiceRequest,
    request: any
  ): Promise<any> {
    this.logger.info(
      `[getService] Called with keyAttributes: ${JSON.stringify(params.keyAttributes)}`
    );

    const pplQuery = PPLQueryBuilder.buildGetServiceQuery({
      queryIndex: params.queryIndex!,
      startTime: params.startTime,
      endTime: params.endTime,
      keyAttributes: params.keyAttributes,
    });

    this.logger.info(`[getService] PPL Query: ${pplQuery}`);

    // Execute PPL query
    const rawResponse = await this.executePPLQuery(context, pplQuery, request);
    this.logger.debug(`[getService] Raw response: ${JSON.stringify(rawResponse)}`);

    // Transform the response
    const transformedResponse = ResponseProcessor.transformGetService(rawResponse);
    return transformedResponse;
  }

  /**
   * List service operations for a given service
   */
  async listServiceOperations(
    context: RequestHandlerContext,
    params: ListServiceOperationsRequest,
    request: any
  ): Promise<any> {
    this.logger.info(
      `[listServiceOperations] Called with keyAttributes: ${JSON.stringify(params.keyAttributes)}`
    );

    const pplQuery = PPLQueryBuilder.buildListServiceOperationsQuery({
      queryIndex: params.queryIndex!,
      startTime: params.startTime,
      endTime: params.endTime,
      keyAttributes: params.keyAttributes,
    });

    this.logger.info(`[listServiceOperations] PPL Query: ${pplQuery}`);

    // Execute PPL query
    const rawResponse = await this.executePPLQuery(context, pplQuery, request);

    // Transform the response
    const transformedResponse = ResponseProcessor.transformListServiceOperations(rawResponse);
    return transformedResponse;
  }

  /**
   * List service dependencies for a given service
   */
  async listServiceDependencies(
    context: RequestHandlerContext,
    params: ListServiceDependenciesRequest,
    request: any
  ): Promise<any> {
    this.logger.info(
      `[listServiceDependencies] Called with keyAttributes: ${JSON.stringify(params.keyAttributes)}`
    );

    const pplQuery = PPLQueryBuilder.buildListServiceDependenciesQuery({
      queryIndex: params.queryIndex!,
      startTime: params.startTime,
      endTime: params.endTime,
      keyAttributes: params.keyAttributes,
    });

    this.logger.info(`[listServiceDependencies] PPL Query: ${pplQuery}`);

    // Execute PPL query
    const rawResponse = await this.executePPLQuery(context, pplQuery, request);

    // Transform the response
    const transformedResponse = ResponseProcessor.transformListServiceDependencies(rawResponse);
    return transformedResponse;
  }

  /**
   * Get service map (topology) data
   */
  async getServiceMap(
    context: RequestHandlerContext,
    params: GetServiceMapRequest,
    request: any
  ): Promise<any> {
    this.logger.info(
      `[getServiceMap] Called with time range: ${params.startTime} - ${params.endTime}`
    );

    const pplQuery = PPLQueryBuilder.buildGetServiceMapQuery({
      queryIndex: params.queryIndex!,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    this.logger.info(`[getServiceMap] PPL Query: ${pplQuery}`);

    // Execute PPL query
    const rawResponse = await this.executePPLQuery(context, pplQuery, request);

    // Transform the response
    const transformedResponse = ResponseProcessor.transformGetServiceMap(rawResponse);
    return transformedResponse;
  }

  /**
   * List all services in the time range
   */
  async listServices(
    context: RequestHandlerContext,
    params: ListServicesRequest,
    request: any
  ): Promise<any> {
    this.logger.info(
      `[listServices] Called with time range: ${params.startTime} - ${params.endTime}`
    );

    // Query for ServiceOperationDetail events and extract unique services using stats aggregation
    // Note: We use ServiceOperationDetail instead of ServiceConnection because
    // the index may not have ServiceConnection events populated yet
    const pplQuery = PPLQueryBuilder.buildListServicesQuery({
      queryIndex: params.queryIndex!,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    this.logger.info(`[listServices] PPL Query: ${pplQuery}`);

    // Execute PPL query
    const rawResponse = await this.executePPLQuery(context, pplQuery, request);
    this.logger.debug(`[listServices] Raw response: ${JSON.stringify(rawResponse)}`);

    // Transform the stats aggregation response to service list format
    const services = ResponseProcessor.transformListServices(rawResponse);

    return {
      services,
      totalCount: services.length,
      nextToken: params.nextToken,
    };
  }

  /**
   * Execute a PPL query using the PPL facet
   *
   * This method uses the existing PPL facet from the observability plugin,
   * which properly handles authentication.
   */
  private async executePPLQuery(
    context: RequestHandlerContext,
    pplQuery: string,
    request: any
  ): Promise<any> {
    this.logger.info('PPLClient: Executing PPL query via PPL facet');

    try {
      this.logger.debug(`PPL Query: ${pplQuery}`);

      // Build request for PPL facet - it needs the raw request object
      // with body.query and body.format
      const pplRequest = {
        ...request, // Keep the original request for authentication
        body: {
          query: pplQuery,
          format: 'jdbc',
        },
        query: {
          dataSourceMDSId: '',
        },
      };

      this.logger.debug(`PPL Request body: ${JSON.stringify(pplRequest.body)}`);

      // Use PPL facet - it handles authentication properly
      const queryRes = await this.pplFacet.describeQuery(context, pplRequest);

      if (!queryRes.success) {
        this.logger.error(`PPL Query failed: ${JSON.stringify(queryRes.data)}`);
        throw new Error(queryRes.data.message || queryRes.data.body || 'PPL query failed');
      }

      this.logger.info('PPL Query executed successfully via PPL facet');
      this.logger.debug(`PPL Query result: ${JSON.stringify(queryRes.data)}`);

      // PPL facet returns data in the expected format (schema, datarows)
      return queryRes.data;
    } catch (error) {
      this.logger.error(`PPL Query execution failed: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);

      // Handle index not found / unauthorized errors more gracefully
      if (
        error.message?.includes('Unauthorized') ||
        error.message?.includes('index_not_found_exception')
      ) {
        this.logger.warn('Index may not exist or user lacks permissions. Returning empty result.');
        return {
          schema: [],
          datarows: [],
          total: 0,
        };
      }

      throw error;
    }
  }
}
