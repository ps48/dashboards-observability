/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// requests constants
export const PPL_PROMETHEUS_CATALOG_REQUEST =
  'show catalogs | where CONNECTOR_TYPE="PROMETHEUS" | fields CATALOG_NAME';

// redux
export const REDUX_SLICE_METRICS = 'metrics';

export const resolutionOptions = [
  { value: 's', text: 'seconds' },
  { value: 'm', text: 'minutes' },
  { value: 'h', text: 'hours' },
  { value: 'd', text: 'days' },
  { value: 'M', text: 'Months' },
  { value: 'q', text: 'quarters' },
  { value: 'y', text: 'years' },
];

export const DEFAULT_METRIC_HEIGHT = 2;
export const DEFAULT_METRIC_WIDTH = 12;