/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter, Logger, CoreSetup } from '../../../../../src/core/server';
import { PPLClient } from '../services/apm/clients/ppl_client';
import { PrometheusClient } from '../services/apm/clients/prometheus_client';
import {
  OPERATION_QUERY_INDEX_MAP,
  DEFAULT_PROMETHEUS_CONNECTION_ID,
} from '../../common/constants/apm_config';
import { PPLFacet } from '../services/facets/ppl_facet';

// Valid PPL client methods
const VALID_PPL_OPERATIONS = [
  'listServices',
  'getService',
  'listServiceOperations',
  'listServiceDependencies',
  'getServiceMap',
];

// Valid Prometheus client methods
const VALID_PROMETHEUS_OPERATIONS = ['executeMetricRequest'];

// Cache for lazily instantiated clients
const cachedClients: {
  pplClient?: PPLClient;
  prometheusClient?: PrometheusClient;
} = {};

/**
 * Get or create APM clients lazily
 * This avoids blocking the plugin setup phase
 */
async function getOrCreateClients(core: CoreSetup, logger: Logger, pplFacet: PPLFacet) {
  if (!cachedClients.pplClient || !cachedClients.prometheusClient) {
    logger.info('[APM] Lazy instantiating APM clients on first request');
    const [, startDeps] = await core.getStartServices();

    // PPL client uses the existing PPL facet
    cachedClients.pplClient = new PPLClient(logger, pplFacet);
    // Prometheus client uses the data plugin's search service
    cachedClients.prometheusClient = new PrometheusClient(
      logger,
      startDeps.data.search,
      DEFAULT_PROMETHEUS_CONNECTION_ID
    );

    logger.info('[APM] APM clients instantiated successfully');
  }
  return cachedClients;
}

/**
 * Register unified APM resources route
 *
 * This route handles all APM operations through direct method invocation.
 * The UI specifies the exact operation name (e.g., 'listServices', 'executeMetricRequest')
 * and the route dynamically invokes the appropriate client method.
 *
 * Clients are instantiated lazily on the first request to avoid blocking plugin setup.
 *
 * Pattern: /api/observability/apm/resources
 */
export function registerApmResourcesRoute(
  router: IRouter,
  logger: Logger,
  core: CoreSetup,
  pplFacet: PPLFacet
) {
  router.post(
    {
      path: '/api/observability/apm/resources',
      validate: {
        body: schema.object({
          connection: schema.object({
            id: schema.string(),
            type: schema.string(),
          }),
          operation: schema.string(), // PPL method name: 'listServices', 'getService', etc.
          // or Prometheus method: 'executeMetricRequest'
          params: schema.object({}, { unknowns: 'allow' }), // Dynamic params based on operation
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { operation, params } = request.body;

        logger.info(`[APM Resources] Operation: ${operation}`);
        logger.debug(`[APM Resources] Params: ${JSON.stringify(params)}`);

        // Lazy instantiation - get or create clients on first request
        // This is safe because we're in request time, not setup time
        const { pplClient, prometheusClient } = await getOrCreateClients(core, logger, pplFacet);

        // Route to appropriate client based on operation
        if (VALID_PROMETHEUS_OPERATIONS.includes(operation)) {
          // Prometheus client for metrics
          if (typeof prometheusClient![operation] !== 'function') {
            throw new Error(`Invalid Prometheus operation: ${operation}`);
          }
          const result = await prometheusClient![operation](context, params);
          return response.ok({ body: result });
        } else if (VALID_PPL_OPERATIONS.includes(operation)) {
          // PPL client for service topology data
          if (typeof pplClient![operation] !== 'function') {
            throw new Error(`Invalid PPL operation: ${operation}`);
          }

          // Inject queryIndex from mapping if not provided
          const queryIndex = params.queryIndex || OPERATION_QUERY_INDEX_MAP[operation];
          const enrichedParams = { ...params, queryIndex };

          logger.debug(`[APM Resources] Enriched params with queryIndex: ${queryIndex}`);

          // Pass the request object for authentication
          const result = await pplClient![operation](context, enrichedParams, request);
          return response.ok({ body: result });
        } else {
          throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        logger.error(`[APM Resources] Error: ${error.message}`);
        logger.error(`[APM Resources] Stack: ${error.stack}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message, error: error.toString() },
        });
      }
    }
  );

  logger.info('[APM Resources] Route registered: POST /api/observability/apm/resources');
}
