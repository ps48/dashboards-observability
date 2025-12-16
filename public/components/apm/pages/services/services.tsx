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
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiBadge,
  EuiPanel,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiCheckboxGroup,
  EuiAccordion,
  EuiFieldSearch,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ChromeBreadcrumb } from '../../../../../../src/core/public';
import { useServices } from '../../utils/hooks/use_services';
import { FilterBar } from '../../shared_components/filter_bar';
import { EmptyState } from '../../shared_components/empty_state';
import { TopServicesByFaultRate } from '../../shared_components/top_services_by_fault_rate';
import { TopDependenciesByFaultRate } from '../../shared_components/top_dependencies_by_fault_rate';
import { TimeRange, ServiceTableItem } from '../../services/types';
import { parseTimeRange } from '../../utils/time_utils';
import { DEFAULT_TOPOLOGY_INDEX, DEFAULT_PROMETHEUS_CONNECTION_NAME } from '../../utils/config';
import { parseEnvironmentType } from '../../utils/query_requests/response_processor';

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

  const [filteredItems, setFilteredItems] = useState<ServiceTableItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<keyof ServiceTableItem>('serviceName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(true);
  const [actionPopoverId, setActionPopoverId] = useState<string | null>(null);
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

  const handleFilteredItems = useCallback((items: ServiceTableItem[]) => {
    setFilteredItems(items);
  }, []);

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

  // Apply environment and groupByAttributes filtering on top of FilterBar filtering
  const fullyFilteredItems = useMemo(() => {
    let filtered = [...filteredItems];

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
  }, [filteredItems, selectedEnvironments, selectedGroupByAttributes]);

  const columns: Array<EuiBasicTableColumn<ServiceTableItem>> = useMemo(
    () => [
      {
        field: 'serviceName',
        name: 'Service Name',
        sortable: true,
        width: '40%',
        render: (serviceName: string, item: ServiceTableItem) => (
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
        ),
      },
      {
        field: 'environment',
        name: 'Environment',
        sortable: true,
        width: '40%',
        render: (environment: string) => {
          const color = environment === 'production' ? 'primary' : 'default';
          return <EuiBadge color={color}>{environment}</EuiBadge>;
        },
      },
      {
        name: 'Actions',
        width: '10%',
        render: (item: ServiceTableItem) => {
          const itemKey = `${item.serviceName}::${item.environment}`;
          const isPopoverOpen = actionPopoverId === itemKey;

          const contextMenuItems = [
            <EuiContextMenuItem
              key="view"
              icon="eye"
              onClick={() => {
                setActionPopoverId(null);
                onServiceClick?.(item.serviceName, item.environment);
              }}
            >
              View service details
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="traces"
              icon="list"
              onClick={() => {
                setActionPopoverId(null);
                // TODO: Navigate to traces for this service
              }}
            >
              View traces
            </EuiContextMenuItem>,
          ];

          return (
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="boxesHorizontal"
                  aria-label="Actions"
                  onClick={() => setActionPopoverId(isPopoverOpen ? null : itemKey)}
                  data-test-subj={`serviceActionsButton-${item.serviceName}`}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={() => setActionPopoverId(null)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel items={contextMenuItems} />
            </EuiPopover>
          );
        },
      },
    ],
    [onServiceClick, actionPopoverId]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: fullyFilteredItems.length,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pageIndex, pageSize, fullyFilteredItems.length]
  );

  const onTableChange = useCallback(({ page, sort }: any) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  }, []);

  if (isLoading) {
    return (
      <EuiPage data-test-subj="servicesPage">
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

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

  if (!services || services.length === 0) {
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
            {/* Top Filter Bar */}
            <FilterBar
              items={services}
              timeRange={timeRange}
              onFilteredItems={handleFilteredItems}
              onTimeChange={handleTimeChange}
              onRefresh={handleRefresh}
            />

            <EuiSpacer size="s" />

            {/* Main content with side drawer */}
            <EuiFlexGroup direction="row" gutterSize="s">
              {/* Left Side Drawer */}
              <EuiFlexItem grow={false}>
                {filterDrawerOpen ? (
                  <EuiPanel style={{ width: 250 }}>
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      alignItems="center"
                      gutterSize="none"
                    >
                      <EuiFlexItem grow={false}>
                        <strong>Filters</strong>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          onClick={() => setFilterDrawerOpen(false)}
                          iconType="menuLeft"
                          iconSize="m"
                          color="text"
                          data-test-subj="filter-drawer-close"
                          aria-label="Close filter drawer"
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
                                                onClick={() => handleClearAllForAttribute(attrPath)}
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
                ) : (
                  <EuiPanel>
                    <EuiButtonIcon
                      onClick={() => setFilterDrawerOpen(true)}
                      iconType="menuRight"
                      iconSize="m"
                      color="text"
                      data-test-subj="filter-drawer-open"
                      aria-label="Open filter drawer"
                    />
                  </EuiPanel>
                )}
              </EuiFlexItem>

              {/* Right Main Content */}
              <EuiFlexItem>
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
                {fullyFilteredItems.length === 0 ? (
                  <EmptyState
                    title="No matching services"
                    body="Try adjusting your search query or time range to find services."
                    iconType="search"
                  />
                ) : (
                  <EuiBasicTable
                    items={fullyFilteredItems}
                    columns={columns}
                    sorting={sorting}
                    pagination={pagination}
                    onChange={onTableChange}
                    data-test-subj="servicesTable"
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
