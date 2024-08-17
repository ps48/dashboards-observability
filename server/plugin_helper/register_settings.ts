/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// import { schema } from '@osd/config-schema';
// import { UiSettingsServiceSetup } from '../../../../src/core/server/ui_settings';
// import {
//   TRACE_CUSTOM_SERVICE_INDEX_SETTING,
//   TRACE_CUSTOM_SPAN_INDEX_SETTING,
// } from '../../common/constants/trace_analytics';

// export const registerObservabilityUISettings = (uiSettings: UiSettingsServiceSetup) => {
//   uiSettings.register({
//     [TRACE_CUSTOM_SPAN_INDEX_SETTING]: {
//       name: 'Trace analytics span indices',
//       value: '',
//       category: ['Observability'],
//       description: 'Configure custom span indices to be used by the trace analytics plugin',
//       schema: schema.string(),
//     },
//   });

//   uiSettings.register({
//     [TRACE_CUSTOM_SERVICE_INDEX_SETTING]: {
//       name: 'Trace analytics service indices',
//       value: '',
//       category: ['Observability'],
//       description: 'Configure custom service indices to be used by the trace analytics plugin',
//       schema: schema.string(),
//     },
//   });
// };
