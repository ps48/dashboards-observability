/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  PPL_PROMETHEUS_CATALOG_REQUEST,
  REDUX_SLICE_METRICS,
} from '../../../../../common/constants/metrics';
import { pplServiceRequestor, getVisualizations, getNewVizDimensions } from '../../helpers/utils';
import PPLService from '../../../../services/requests/ppl';
import { MetricType } from '../../../../../common/types/metrics';

const initialState = {
  pplService: PPLService,
  metrics: [],
  selected: [],
  metricsLayout: [],
};

export const loadMetrics = createAsyncThunk('metrics/loadData', async (services: any) => {
  const { http, pplService } = services;
  const customData = await fetchCustomMetrics(http);
  const remoteData = await fetchRemoteMetrics(pplService);

  return Promise.all([customData, ...remoteData]).then((datasets) => datasets.flat());
});

const fetchCustomMetrics = async (http: any) => {
  const dataSet = await getVisualizations(http);

  const normalizedData = dataSet.visualizations.map((obj: any) => ({
    id: obj.id,
    name: obj.name,
    catalog: 'CUSTOM_METRICS',
    type: obj.type,
  }));
  return normalizedData;
};

const fetchRemoteMetrics = async (pplService: any) => {
  const dataSet = [];
  const catalogs = await pplServiceRequestor(pplService, PPL_PROMETHEUS_CATALOG_REQUEST);
  for (const catalog of catalogs.jsonData) {
    const catalogData = await pplServiceRequestor(
      pplService,
      `source = ${catalog.CATALOG_NAME}.information_schema.tables`
    );
    const normalizedData = catalogData.jsonData.map((obj: any) => ({
      id: `${obj.TABLE_CATALOG}.${obj.TABLE_NAME}`,
      name: `${obj.TABLE_CATALOG}.${obj.TABLE_NAME}`,
      catalog: `${catalog.CATALOG_NAME}`,
      type: obj.TABLE_TYPE,
    }));
    dataSet.push(normalizedData);
  }
  return dataSet;
};

const updateLayoutBySelection = (state: any, newMetric: any) => {
  const newDimensions = getNewVizDimensions(state.metricsLayout);

  const metricVisualization: MetricType = {
    id: newMetric.id,
    savedVisualizationId: newMetric.id,
    x: newDimensions.x,
    y: newDimensions.y,
    h: newDimensions.h,
    w: newDimensions.w,
    metricType: newMetric.catalog === 'CUSTOM_METRICS' ? 'savedCustomMetric' : 'prometheusMetric',
  };
  state.metricsLayout = [...state.metricsLayout, metricVisualization];
};

const updateLayoutByDeSelection = (state: any, newMetric: any) => {
  const sortedMetricsLayout = state.metricsLayout.sort((a: MetricType, b: MetricType) => {
    if (a.y > b.y) return 1;
    if (a.y < b.y) return -1;
    else return 0;
  });

  let newMetricsLayout = [] as MetricType[];
  let heightSubtract = 0;

  sortedMetricsLayout.map((metricLayout: MetricType) => {
    if (metricLayout.id !== newMetric.id) {
      metricLayout.y = metricLayout.y - heightSubtract;
      newMetricsLayout.push(metricLayout);
    } else {
      heightSubtract = metricLayout.h;
    }
  });
  state.metricsLayout = newMetricsLayout;
};

export const metricSlice = createSlice({
  name: REDUX_SLICE_METRICS,
  initialState,
  reducers: {
    selectMetric: (state, { payload }) => {
      state.selected.push(payload.id);
      updateLayoutBySelection(state, payload);
    },
    deSelectMetric: (state, { payload }) => {
      updateLayoutByDeSelection(state, payload);
      state.selected = state.selected.filter((id) => id !== payload.id);
    },
    updateMetricsLayout: (state, { payload }) => {
      state.metricsLayout = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadMetrics.fulfilled, (state, { payload }) => {
      state.metrics = payload;
    });
  },
});

export const { deSelectMetric, selectMetric, updateMetricsLayout } = metricSlice.actions;

export const metricsStateSelector = (state) => state.metrics;

export const availableMetricsSelector = (state) =>
  state.metrics.metrics.filter((metric) => !state.metrics.selected.includes(metric.id));

export const selectedMetricsSelector = (state) =>
  state.metrics.metrics.filter((metric) => state.metrics.selected.includes(metric.id));

export const metricsLayoutSelector = (state) => state.metrics.metricsLayout;

export default metricSlice.reducer;