/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeRange } from '../services/types';
import { DEFAULT_PPL_DATA_SOURCE_ID } from './config';
import { DATA_PREPPER_INDEX_NAME } from '../../../../common/constants/trace_analytics';
import { coreRefs } from '../../../framework/core_refs';

// Constants for trace discovery navigation
const INDEX_PATTERN_ID = '49e6bf8f-dfbd-4267-947b-a02c3bf9f3bd';
const EXPLORE_APP_ID = 'explore';

/**
 * Navigates to the discover/traces page filtered by service error spans
 * Uses navigateToApp to automatically handle workspace context
 *
 * @param serviceName - The service to filter by
 * @param timeRange - The time range for the query
 */
export function navigateToErrorTraces(serviceName: string, timeRange: TimeRange): void {
  const dataSourceId = DEFAULT_PPL_DATA_SOURCE_ID;
  const indexPattern = DATA_PREPPER_INDEX_NAME;

  // Construct PPL query to filter by service name and error status
  const pplQuery = `| where serviceName = "${serviceName}" | where \`status.code\` > 0`;

  // Build path using RISON-like format (OpenSearch Dashboards URL state format)
  // Format: _q=(dataset:(...),language:PPL,query:'...')&_g=(...)
  // Note: We only URL-encode the PPL query string content
  const path = `traces/#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:${
    timeRange.from
  },to:${
    timeRange.to
  }))&_q=(dataset:(dataSource:(id:'${dataSourceId}',title:os-3.3,type:OpenSearch,version:'3.3.0'),id:'${dataSourceId}::${INDEX_PATTERN_ID}',schemaMappings:(),signalType:traces,timeFieldName:startTime,title:'${indexPattern}',type:INDEX_PATTERN),language:PPL,query:'${encodeURIComponent(
    pplQuery
  )}')`;

  // Use navigateToApp to handle workspace context automatically
  coreRefs.application?.navigateToApp(EXPLORE_APP_ID, { path });
}
