/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiBadge,
  EuiPanel,
  EuiButtonIcon,
  EuiToolTip,
  EuiCheckboxGroup,
  EuiAccordion,
  EuiFieldSearch,
  EuiText,
  EuiHorizontalRule,
  EuiResizableContainer,
} from '@elastic/eui';
import { ChromeBreadcrumb } from '../../../../../../src/core/public';
import { useServices } from '../../utils/hooks/use_services';
import { useServicesRedMetrics } from '../../utils/hooks/use_services_red_metrics';
import { ApmPageHeader } from '../../shared_components/apm_page_header';
import { EmptyState } from '../../shared_components/empty_state';
import { LanguageIcon } from '../../shared_components/language_icon';
import { MetricSparkline } from '../../shared_components/metric_sparkline';
import { TopServicesByFaultRate } from '../../shared_components/top_services_by_fault_rate';
import { TopDependenciesByFaultRate } from '../../shared_components/top_dependencies_by_fault_rate';
import { TimeRange, ServiceTableItem } from '../../services/types';
import { parseTimeRange } from '../../utils/time_utils';
import { DEFAULT_TOPOLOGY_INDEX, DEFAULT_PROMETHEUS_CONNECTION_NAME } from '../../utils/config';
import { parseEnvironmentType } from '../../utils/query_requests/response_processor';
import {
  navigateToServiceMap,
  navigateToServiceLogs,
  navigateToServiceTraces,
} from '../../utils/navigation_utils';

/**
 * Gets a nested value from an object using dot notation path
 * Example: getNestedValue({ telemetry: { sdk: { language: "python" } } }, "telemetry.sdk.language") -> "python"
 */
function getNestedValue(obj: Record<string, any>, path: string): unknown {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current: any, key) => current?.[key], obj);
}

// Available environment types (platform types)
const AVAILABLE_ENVIRONMENTS = ['generic', 'EKS', 'ECS', 'EC2', 'Lambda'];

export interface ApmServicesProps {
  chrome: any;
  parentBreadcrumb: ChromeBreadcrumb;
  queryIndex?: string;
  prometheusConnectionId?: string;
  onServiceClick?: (serviceName: string, environment: string) => void;
  [key: string]: any;
}

/**
 * Services - Main page listing all APM services
 *
 * Shows:
 * - Filterable table of services
 * - Service name, environment
 * - Click to navigate to service details
 */
export const Services: React.FC<ApmServicesProps> = ({
  chrome,
  parentBreadcrumb,
  queryIndex,
  prometheusConnectionId,
  onServiceClick,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });

  const [selectedEnvironments, setSelectedEnvironments] = useState<Record<string, boolean>>({});
  const [selectedGroupByAttributes, setSelectedGroupByAttributes] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [attributeSearchQueries, setAttributeSearchQueries] = useState<Record<string, string>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set breadcrumbs
  React.useEffect(() => {
    chrome.setBreadcrumbs([
      parentBreadcrumb,
      {
        text: 'Services',
        href: '#/services',
      },
    ]);
  }, [chrome, parentBreadcrumb]);

  const parsedTimeRange = useMemo(() => parseTimeRange(timeRange), [timeRange]);

  // Use config defaults if not provided
  const effectiveQueryIndex = queryIndex || DEFAULT_TOPOLOGY_INDEX;
  const effectivePrometheusConnection =
    prometheusConnectionId || DEFAULT_PROMETHEUS_CONNECTION_NAME;

  const { data: services, isLoading, error, availableGroupByAttributes, refetch } = useServices({
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    queryIndex: effectiveQueryIndex,
    refreshTrigger,
  });

  const handleTimeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    refetch();
  }, [refetch]);

  // Filtered attribute values based on search queries
  const filteredAttributeValues = useMemo(() => {
    const result: Record<string, string[]> = {};

    Object.entries(availableGroupByAttributes || {}).forEach(([attrPath, values]) => {
      const searchQuery = attributeSearchQueries[attrPath] || '';
      if (!searchQuery) {
        result[attrPath] = values;
      } else {
        const searchLower = searchQuery.toLowerCase();
        result[attrPath] = values.filter((v) => v.toLowerCase().includes(searchLower));
      }
    });

    return result;
  }, [availableGroupByAttributes, attributeSearchQueries]);

  // Create checkbox options for environments
  const environmentCheckboxes = useMemo(() => {
    return AVAILABLE_ENVIRONMENTS.map((env) => ({
      id: env,
      label: env,
    }));
  }, []);

  // Handle environment filter changes
  const onEnvironmentChange = useCallback((id: string) => {
    setSelectedEnvironments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Handle select all for environments
  const handleSelectAllEnvironments = useCallback(() => {
    const newSelections: Record<string, boolean> = {};
    AVAILABLE_ENVIRONMENTS.forEach((env) => {
      newSelections[env] = true;
    });
    setSelectedEnvironments(newSelections);
  }, []);

  // Handle clear all for environments
  const handleClearAllEnvironments = useCallback(() => {
    setSelectedEnvironments({});
  }, []);

  // Handle select all for a specific attribute
  const handleSelectAllForAttribute = useCallback(
    (attrPath: string) => {
      const allValues = filteredAttributeValues[attrPath] || [];
      const newSelections: Record<string, boolean> = {};
      allValues.forEach((value) => {
        newSelections[value] = true;
      });

      setSelectedGroupByAttributes((prev) => ({
        ...prev,
        [attrPath]: newSelections,
      }));
    },
    [filteredAttributeValues]
  );

  // Handle clear all for a specific attribute
  const handleClearAllForAttribute = useCallback((attrPath: string) => {
    setSelectedGroupByAttributes((prev) => ({
      ...prev,
      [attrPath]: {},
    }));
  }, []);

  // Handle search change for a specific attribute
  const handleSearchChange = useCallback((attrPath: string, searchValue: string) => {
    setAttributeSearchQueries((prev) => ({
      ...prev,
      [attrPath]: searchValue,
    }));
  }, []);

  // Apply environment and groupByAttributes filtering
  const fullyFilteredItems = useMemo(() => {
    let filtered = [...(services || [])];

    // Filter by environment (platform type)
    const hasSelectedEnvironments = Object.values(selectedEnvironments).some((v) => v);
    if (hasSelectedEnvironments) {
      filtered = filtered.filter((service) => {
        const envDetails = parseEnvironmentType(service.environment);
        const platform = envDetails.platform.toUpperCase();

        // Map platform to filter options
        let matchKey = '';
        if (platform === 'GENERIC') matchKey = 'generic';
        else if (platform === 'EKS') matchKey = 'EKS';
        else if (platform === 'ECS') matchKey = 'ECS';
        else if (platform === 'EC2') matchKey = 'EC2';
        else if (platform === 'LAMBDA') matchKey = 'Lambda';

        return selectedEnvironments[matchKey] === true;
      });
    }

    // Filter by groupByAttributes
    const hasGroupByAttributeFilters = Object.keys(selectedGroupByAttributes).some((attrPath) =>
      Object.values(selectedGroupByAttributes[attrPath]).some((v) => v)
    );

    if (hasGroupByAttributeFilters) {
      filtered = filtered.filter((service) => {
        // Check if service matches any selected groupByAttribute values
        for (const [attrPath, selectedValues] of Object.entries(selectedGroupByAttributes)) {
          const hasSelectedValues = Object.entries(selectedValues).some(
            ([_val, isSelected]) => isSelected
          );
          if (!hasSelectedValues) continue;

          // Get service's value for this attribute path
          const serviceValue = getNestedValue(service.groupByAttributes, attrPath);

          // Check if service's value is selected
          const matches = Object.entries(selectedValues).some(
            ([val, isSelected]) => isSelected && String(serviceValue) === val
          );

          if (!matches) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [services, selectedEnvironments, selectedGroupByAttributes]);

  // Fetch RED metrics for ALL filtered services (needed for sorting)
  const { metricsMap, isLoading: metricsLoading } = useServicesRedMetrics({
    services: fullyFilteredItems.map((s) => ({
      serviceName: s.serviceName,
      environment: s.environment,
    })),
    startTime: parsedTimeRange.startTime,
    endTime: parsedTimeRange.endTime,
    prometheusConnectionId: effectivePrometheusConnection,
  });

  const columns: Array<EuiBasicTableColumn<ServiceTableItem>> = useMemo(
    () => [
      {
        field: 'serviceName',
        name: 'Service Name',
        sortable: true,
        width: '25%',
        render: (serviceName: string, item: ServiceTableItem) => {
          const language = item.groupByAttributes?.telemetry?.sdk?.language;

          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <LanguageIcon language={language} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink
                  onClick={() => {
                    if (onServiceClick) {
                      onServiceClick(serviceName, item.environment);
                    }
                  }}
                  data-test-subj={`serviceLink-${serviceName}`}
                >
                  <strong>{serviceName}</strong>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'environment',
        name: 'Environment',
        sortable: true,
        width: '15%',
        render: (environment: string) => {
          const color = environment === 'production' ? 'primary' : 'default';
          return <EuiBadge color={color}>{environment}</EuiBadge>;
        },
      },
      {
        field: 'latency' as any,
        name: 'Latency (P95)',
        width: '10%',
        sortable: (a: ServiceTableItem, b: ServiceTableItem) => {
          const aMetrics = metricsMap.get(a.serviceName);
          const bMetrics = metricsMap.get(b.serviceName);
          const aLatency = aMetrics?.latency || [];
          const bLatency = bMetrics?.latency || [];
          const aValue = aLatency.length > 0 ? aLatency[aLatency.length - 1].value : 0;
          const bValue = bLatency.length > 0 ? bLatency[bLatency.length - 1].value : 0;
          return aValue - bValue;
        },
        align: 'center',
        render: (_fieldValue: any, item: ServiceTableItem) => {
          const metrics = metricsMap.get(item.serviceName);
          const latencyData = metrics?.latency || [];
          const latestValue =
            latencyData.length > 0 ? latencyData[latencyData.length - 1].value : 0;
          const latencyMs = (latestValue * 1000).toFixed(0);

          return (
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} style={{ minWidth: '60px' }}>
                <EuiText size="s">{latencyMs} ms</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <MetricSparkline
                  data={latencyData}
                  isLoading={metricsLoading}
                  color="#6092C0"
                  height={20}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'throughput' as any,
        name: 'Throughput',
        width: '10%',
        sortable: (a: ServiceTableItem, b: ServiceTableItem) => {
          const aMetrics = metricsMap.get(a.serviceName);
          const bMetrics = metricsMap.get(b.serviceName);
          const aThroughput = aMetrics?.throughput || [];
          const bThroughput = bMetrics?.throughput || [];
          const aValue = aThroughput.length > 0 ? aThroughput[aThroughput.length - 1].value : 0;
          const bValue = bThroughput.length > 0 ? bThroughput[bThroughput.length - 1].value : 0;
          return aValue - bValue;
        },
        align: 'center',
        render: (_fieldValue: any, item: ServiceTableItem) => {
          const metrics = metricsMap.get(item.serviceName);
          const throughputData = metrics?.throughput || [];
          const latestValue =
            throughputData.length > 0 ? throughputData[throughputData.length - 1].value : 0;
          const throughputFormatted = latestValue.toFixed(0);

          return (
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} style={{ minWidth: '70px' }}>
                <EuiText size="s">{throughputFormatted} req/m</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <MetricSparkline
                  data={throughputData}
                  isLoading={metricsLoading}
                  color="#54B399"
                  height={20}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'failureRatio' as any,
        name: 'Failure Ratio',
        width: '10%',
        sortable: (a: ServiceTableItem, b: ServiceTableItem) => {
          const aMetrics = metricsMap.get(a.serviceName);
          const bMetrics = metricsMap.get(b.serviceName);
          const aFailure = aMetrics?.failureRatio || [];
          const bFailure = bMetrics?.failureRatio || [];
          const aValue = aFailure.length > 0 ? aFailure[aFailure.length - 1].value : 0;
          const bValue = bFailure.length > 0 ? bFailure[bFailure.length - 1].value : 0;
          return aValue - bValue;
        },
        align: 'center',
        render: (_fieldValue: any, item: ServiceTableItem) => {
          const metrics = metricsMap.get(item.serviceName);
          const failureData = metrics?.failureRatio || [];
          const latestValue =
            failureData.length > 0 ? failureData[failureData.length - 1].value : 0;
          const failureFormatted = latestValue.toFixed(1);

          return (
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} style={{ minWidth: '50px' }}>
                <EuiText size="s">{failureFormatted}%</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <MetricSparkline
                  data={failureData}
                  isLoading={metricsLoading}
                  color="#D36086"
                  height={20}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: 'Actions',
        width: '15%',
        align: 'center',
        render: (item: ServiceTableItem) => (
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem grow={false}>
              <EuiToolTip content="View service map">
                <EuiButtonIcon
                  iconType="graphApp"
                  aria-label="View service map"
                  onClick={() => navigateToServiceMap(item.serviceName, item.environment)}
                  data-test-subj={`serviceMapButton-${item.serviceName}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="View logs">
                <EuiButtonIcon
                  iconType="discoverApp"
                  aria-label="View logs"
                  onClick={() =>
                    navigateToServiceLogs(item.serviceName, item.environment, timeRange)
                  }
                  data-test-subj={`serviceLogsButton-${item.serviceName}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="View traces">
                <EuiButtonIcon
                  iconType="apmTrace"
                  aria-label="View traces"
                  onClick={() =>
                    navigateToServiceTraces(item.serviceName, item.environment, timeRange)
                  }
                  data-test-subj={`serviceTracesButton-${item.serviceName}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    [onServiceClick, metricsMap, metricsLoading, timeRange]
  );

  if (error) {
    return (
      <EuiPage data-test-subj="servicesPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <EuiCallOut title="Error loading services" color="danger" iconType="alert">
                <p>{error.message}</p>
              </EuiCallOut>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (!isLoading && (!services || services.length === 0)) {
    return (
      <EuiPage data-test-subj="servicesPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <EmptyState
                title="No services found"
                body="No services detected in the selected time range. Services will appear here once they start sending telemetry data."
                iconType="search"
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <EuiPage data-test-subj="servicesPage">
      <EuiPageBody component="main">
        <EuiPageContent color="transparent" hasBorder={false} paddingSize="none">
          <EuiPageContentBody>
            {/* Time filter in page header */}
            <ApmPageHeader
              timeRange={timeRange}
              onTimeChange={handleTimeChange}
              onRefresh={handleRefresh}
            />

            {/* Main content with resizable filter sidebar */}
            <EuiResizableContainer>
              {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => (
                <>
                  {/* Left Side: Filter Sidebar - Collapsible */}
                  <EuiResizablePanel
                    mode={['custom', { position: 'top' }]}
                    id="filter-sidebar"
                    initialSize={15}
                    minSize="10%"
                    paddingSize="s"
                  >
                    <EuiPanel style={{ height: '100%' }}>
                      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <strong>Filters</strong>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            color="text"
                            aria-label="Toggle filter sidebar"
                            iconType="menuLeft"
                            onClick={() => togglePanel('filter-sidebar', { direction: 'left' })}
                            data-test-subj="filter-sidebar-toggle"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>

                      <EuiSpacer size="m" />
                      <EuiHorizontalRule margin="none" />
                      <EuiSpacer size="m" />

                      {/* Environment Filter - Accordion */}
                      <EuiAccordion
                        id="environmentAccordion"
                        buttonContent={
                          <EuiText size="s">
                            <strong>Environment</strong>
                          </EuiText>
                        }
                        initialIsOpen={true}
                        data-test-subj="environmentAccordion"
                      >
                        <EuiSpacer size="s" />

                        {/* Select all / Clear all links */}
                        {environmentCheckboxes.length > 0 && (
                          <>
                            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
                              <EuiFlexItem grow={false}>
                                <EuiLink
                                  onClick={handleSelectAllEnvironments}
                                  data-test-subj="environment-selectAll"
                                  color="primary"
                                >
                                  <EuiText size="xs">Select all</EuiText>
                                </EuiLink>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiLink
                                  onClick={handleClearAllEnvironments}
                                  data-test-subj="environment-clearAll"
                                  color="primary"
                                >
                                  <EuiText size="xs">Clear all</EuiText>
                                </EuiLink>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                            <EuiSpacer size="s" />
                          </>
                        )}

                        {/* Checkbox group */}
                        {environmentCheckboxes.length > 0 ? (
                          <EuiCheckboxGroup
                            options={environmentCheckboxes}
                            idToSelectedMap={selectedEnvironments}
                            onChange={onEnvironmentChange}
                            compressed
                            data-test-subj="environment-checkboxGroup"
                          />
                        ) : (
                          <EuiText size="s" color="subdued">
                            No environments available
                          </EuiText>
                        )}
                      </EuiAccordion>

                      {/* Dynamic GroupByAttributes Filters - Accordion Structure */}
                      {availableGroupByAttributes &&
                        Object.keys(availableGroupByAttributes).length > 0 && (
                          <>
                            <EuiSpacer size="m" />
                            <EuiAccordion
                              id="attributesAccordion"
                              buttonContent={
                                <EuiText size="s">
                                  <strong>Attributes</strong>
                                </EuiText>
                              }
                              initialIsOpen={true}
                              data-test-subj="attributesAccordion"
                            >
                              <EuiSpacer size="s" />

                              {/* Inner accordions for each attribute */}
                              {Object.entries(availableGroupByAttributes).map(
                                ([attrPath, _values], index) => {
                                  const filteredValues = filteredAttributeValues[attrPath] || [];
                                  const searchQuery = attributeSearchQueries[attrPath] || '';

                                  return (
                                    <React.Fragment key={attrPath}>
                                      {index > 0 && <EuiSpacer size="m" />}

                                      <EuiAccordion
                                        id={`attribute-${attrPath}-accordion`}
                                        buttonContent={
                                          <EuiText size="xs">
                                            <strong>{attrPath}</strong>
                                          </EuiText>
                                        }
                                        initialIsOpen={false}
                                        data-test-subj={`attribute-${attrPath}-accordion`}
                                      >
                                        <EuiSpacer size="s" />

                                        {/* Search box */}
                                        <EuiFieldSearch
                                          placeholder={`Search ${attrPath}`}
                                          value={searchQuery}
                                          onChange={(e) =>
                                            handleSearchChange(attrPath, e.target.value)
                                          }
                                          isClearable
                                          fullWidth
                                          compressed
                                          data-test-subj={`attribute-${attrPath}-search`}
                                        />

                                        <EuiSpacer size="s" />

                                        {/* Select all / Clear all links */}
                                        {filteredValues.length > 0 && (
                                          <>
                                            <EuiFlexGroup
                                              gutterSize="s"
                                              justifyContent="spaceBetween"
                                            >
                                              <EuiFlexItem grow={false}>
                                                <EuiLink
                                                  onClick={() =>
                                                    handleSelectAllForAttribute(attrPath)
                                                  }
                                                  data-test-subj={`attribute-${attrPath}-selectAll`}
                                                  color="primary"
                                                >
                                                  <EuiText size="xs">Select all</EuiText>
                                                </EuiLink>
                                              </EuiFlexItem>
                                              <EuiFlexItem grow={false}>
                                                <EuiLink
                                                  onClick={() =>
                                                    handleClearAllForAttribute(attrPath)
                                                  }
                                                  data-test-subj={`attribute-${attrPath}-clearAll`}
                                                  color="primary"
                                                >
                                                  <EuiText size="xs">Clear all</EuiText>
                                                </EuiLink>
                                              </EuiFlexItem>
                                            </EuiFlexGroup>
                                            <EuiSpacer size="s" />
                                          </>
                                        )}

                                        {/* Checkbox list */}
                                        {filteredValues.length > 0 ? (
                                          <EuiCheckboxGroup
                                            options={filteredValues.map((value) => ({
                                              id: value,
                                              label: value,
                                            }))}
                                            idToSelectedMap={
                                              selectedGroupByAttributes[attrPath] || {}
                                            }
                                            onChange={(id) => {
                                              setSelectedGroupByAttributes((prev) => ({
                                                ...prev,
                                                [attrPath]: {
                                                  ...(prev[attrPath] || {}),
                                                  [id]: !prev[attrPath]?.[id],
                                                },
                                              }));
                                            }}
                                            compressed
                                            data-test-subj={`attribute-${attrPath}-checkboxGroup`}
                                          />
                                        ) : (
                                          <EuiText size="s" color="subdued">
                                            No matching values
                                          </EuiText>
                                        )}
                                      </EuiAccordion>
                                    </React.Fragment>
                                  );
                                }
                              )}
                            </EuiAccordion>
                          </>
                        )}
                    </EuiPanel>
                  </EuiResizablePanel>

                  <EuiResizableButton />

                  {/* Right Side: Main Content */}
                  <EuiResizablePanel
                    id="main-content"
                    initialSize={85}
                    minSize="50%"
                    paddingSize="s"
                  >
                    {/* Top Widgets Row */}
                    <EuiFlexGroup gutterSize="s" direction="row" alignItems="stretch">
                      <TopServicesByFaultRate
                        timeRange={timeRange}
                        prometheusConnectionId={effectivePrometheusConnection}
                        onServiceClick={onServiceClick}
                        refreshTrigger={refreshTrigger}
                      />
                      <TopDependenciesByFaultRate
                        timeRange={timeRange}
                        prometheusConnectionId={effectivePrometheusConnection}
                        refreshTrigger={refreshTrigger}
                        onServiceClick={onServiceClick}
                      />
                    </EuiFlexGroup>

                    <EuiSpacer size="s" />

                    {/* Services Table */}
                    <EuiPanel>
                      {fullyFilteredItems.length === 0 ? (
                        <EmptyState
                          title="No matching services"
                          body="Try adjusting your search query or time range to find services."
                          iconType="search"
                        />
                      ) : (
                        <EuiInMemoryTable
                          items={fullyFilteredItems}
                          columns={columns}
                          pagination={{
                            initialPageSize: 10,
                            pageSizeOptions: [10, 20, 50, 100],
                          }}
                          sorting={{
                            sort: {
                              field: 'serviceName',
                              direction: 'asc',
                            },
                          }}
                          loading={isLoading}
                          data-test-subj="servicesTable"
                        />
                      )}
                    </EuiPanel>
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
