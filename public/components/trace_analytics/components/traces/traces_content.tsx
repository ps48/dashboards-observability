/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable react-hooks/exhaustive-deps */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  PropertySort,
} from '@elastic/eui';
import cloneDeep from 'lodash/cloneDeep';
import React, { useEffect, useState } from 'react';
import { coreRefs } from '../../../../framework/core_refs';
import { handleServiceMapRequest } from '../../requests/services_request_handler';
import { handleTracesLandingRequest } from '../../requests/traces_request_handler';
import { getValidFilterFields } from '../common/filters/filter_helpers';
import { FilterType } from '../common/filters/filters';
import { filtersToDsl, processTimeStamp } from '../common/helper_functions';
import { ServiceMap, ServiceObject } from '../common/plots/service_map';
import { SearchBar } from '../common/search_bar';
import { DashboardContent } from '../dashboard/dashboard_content';
import { ServicesList } from './services_list';
import { TracesProps } from './traces';
import { TracesLandingTable } from './traces_landing_table';
export function TracesContent(props: TracesProps) {
  const {
    page,
    http,
    chrome,
    query,
    filters,
    appConfigs,
    startTime,
    endTime,
    childBreadcrumbs,
    getTraceViewUri,
    openTraceFlyout,
    setQuery,
    setFilters,
    setStartTime,
    setEndTime,
    mode,
    dataPrepperIndicesExist,
    jaegerIndicesExist,
    attributesFilterFields,
    setCurrentSelectedService,
  } = props;
  const [tableItems, setTableItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [redirect, setRedirect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [trigger, setTrigger] = useState<'open' | 'closed'>('closed');
  const [serviceMap, setServiceMap] = useState<ServiceObject>({});
  const [filteredService, setFilteredService] = useState('');
  const [serviceMapIdSelected, setServiceMapIdSelected] = useState<
    'latency' | 'error_rate' | 'throughput'
  >('');
  const [includeMetrics, setIncludeMetrics] = useState(false);
  const isNavGroupEnabled = coreRefs?.chrome?.navGroup.getNavGroupEnabled();

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...(isNavGroupEnabled ? [] : [props.parentBreadcrumb]),
      ...childBreadcrumbs,
    ]);
    const validFilters = getValidFilterFields(mode, 'traces', attributesFilterFields);
    setFilters([
      ...filters.map((filter) => ({
        ...filter,
        locked: validFilters.indexOf(filter.field) === -1,
      })),
    ]);
    setRedirect(false);
  }, []);

  useEffect(() => {
    if (
      !redirect &&
      (mode === 'ccs_data_prepper' ||
        (mode === 'data_prepper' && dataPrepperIndicesExist) ||
        (mode === 'jaeger' && jaegerIndicesExist))
    )
      refresh();
  }, [filters, appConfigs, redirect, mode, dataPrepperIndicesExist, jaegerIndicesExist]);

  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  useEffect(() => {
    let newFilteredService = '';
    for (const filter of filters) {
      if (filter.field === 'serviceName') {
        newFilteredService = filter.value;
        break;
      }
    }
    setFilteredService(newFilteredService);
    if (
      !redirect &&
      (mode === 'ccs_data_prepper' ||
        (mode === 'data_prepper' && dataPrepperIndicesExist) ||
        (mode === 'jaeger' && jaegerIndicesExist))
    )
      refresh();
  }, [
    filters,
    appConfigs,
    redirect,
    mode,
    jaegerIndicesExist,
    dataPrepperIndicesExist,
    includeMetrics,
  ]);

  const addFilter = (filter: FilterType) => {
    for (let i = 0; i < filters.length; i++) {
      const addedFilter = filters[i];
      if (addedFilter.field === filter.field) {
        if (addedFilter.operator === filter.operator && addedFilter.value === filter.value) return;
        const newFilters = [...filters];
        newFilters.splice(i, 1, filter);
        setFilters(newFilters);
        return;
      }
    }
    const newFilters = [...filters, filter];
    setFilters(newFilters);
  };

  const refresh = async (sort?: PropertySort) => {
    setLoading(true);
    const DSL = filtersToDsl(
      mode,
      filters,
      query,
      processTimeStamp(startTime, mode),
      processTimeStamp(endTime, mode),
      page,
      appConfigs
    );

    // service map should not be filtered by service name
    const serviceMapDSL = cloneDeep(DSL);
    serviceMapDSL.query.bool.must = serviceMapDSL.query.bool.must.filter(
      (must: any) => must?.term?.serviceName == null
    );

    await handleTracesLandingRequest(
      http,
      DSL,
      tableItems,
      setTableItems,
      setColumns,
      mode,
      props.dataSourceMDSId[0].id,
      sort
    );
    await handleServiceMapRequest(
      http,
      serviceMapDSL,
      mode,
      props.dataSourceMDSId[0].id,
      setServiceMap,
      filteredService,
      includeMetrics
    ),
      setLoading(false);
  };

  const dashboardContent = () => {
    return <DashboardContent {...props} />;
  };

  return (
    <>
      <SearchBar
        query={query}
        filters={filters}
        appConfigs={appConfigs}
        setFilters={setFilters}
        setQuery={setQuery}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        refresh={refresh}
        page={page}
        mode={mode}
        attributesFilterFields={attributesFilterFields}
      />

      <EuiSpacer size="m" />
      <TracesLandingTable
        columnItems={columns}
        items={tableItems}
        refresh={refresh}
        mode={mode}
        loading={loading}
        getTraceViewUri={getTraceViewUri}
        openTraceFlyout={openTraceFlyout}
        jaegerIndicesExist={jaegerIndicesExist}
        dataPrepperIndicesExist={dataPrepperIndicesExist}
      />
      <EuiSpacer size="m" />
      {mode === 'ccs_data_prepper' || mode === 'data_prepper' ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={2}>
              <ServicesList
                addFilter={addFilter}
                serviceMap={serviceMap}
                filteredService={filteredService}
                setFilteredService={setFilteredService}
              />
              <EuiSpacer size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={8}>
              <ServiceMap
                addFilter={addFilter}
                serviceMap={serviceMap}
                idSelected={serviceMapIdSelected}
                setIdSelected={setServiceMapIdSelected}
                page={page}
                currService={filteredService}
                setCurrentSelectedService={setCurrentSelectedService}
                includeMetricsCallback={() => {
                  setIncludeMetrics(true);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <div />
      )}
      <EuiPanel>
        <EuiAccordion
          id="accordion1"
          buttonContent={
            mode === 'ccs_data_prepper' || mode === 'data_prepper'
              ? 'Trace Groups'
              : 'Service and Operations'
          }
          forceState={trigger}
          onToggle={onToggle}
          data-test-subj="trace-groups-service-operation-accordian"
        >
          <EuiSpacer size="m" />
          {trigger === 'open' && dashboardContent()}
        </EuiAccordion>
      </EuiPanel>
    </>
  );
}
