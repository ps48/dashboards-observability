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
import { EmptyState as EuiEmptyState } from '../../shared_components/empty_state';
import { EmptyState as OuiEmptyState } from '../../shared_components/v2/empty_state';
import { TopServicesByFaultRate } from '../../shared_components/top_services_by_fault_rate';
import { TopDependenciesByFaultRate } from '../../shared_components/top_dependencies_by_fault_rate';
import { TimeRange, ServiceTableItem } from '../../services/types';
import { parseTimeRange } from '../../utils/time_utils';
import { DEFAULT_TOPOLOGY_INDEX, DEFAULT_PROMETHEUS_CONNECTION_NAME, USE_OUI_V2 } from '../../utils/config';
import { parseEnvironmentType } from '../../utils/query_requests/response_processor';
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Checkbox,
  Separator,
  Input,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@virajsanghvi/oui';
import { ServicesTableSkeleton } from '../../shared_components/v2/loading_skeleton';
import { BasicTable } from '../../shared_components/v2/basic_table';
import { OuiTable } from '../../shared_components/v2/table';
import { OUI2Wrapper } from '../../shared_components/v2/oui2_wrapper';

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

  // OUI 2.0 columns
  const ouiColumns = useMemo(
    () => [
      {
        field: 'serviceName' as keyof ServiceTableItem,
        name: 'Service Name',
        sortable: true,
        width: '45%',
        render: (item: ServiceTableItem) => (
          <Button
            variant="link"
            onClick={() => {
              if (onServiceClick) {
                onServiceClick(item.serviceName, item.environment);
              }
            }}
            data-test-subj={`serviceLink-${item.serviceName}`}
            className="oui:h-auto oui:p-0 oui:font-semibold"
          >
            {item.serviceName}
          </Button>
        ),
      },
      {
        field: 'environment' as keyof ServiceTableItem,
        name: 'Environment',
        sortable: true,
        width: '45%',
        render: (item: ServiceTableItem) => {
          const variant = item.environment === 'production' ? 'default' : 'secondary';
          return <Badge variant={variant}>{item.environment}</Badge>;
        },
      },
      {
        name: 'Actions',
        width: '10%',
        render: (item: ServiceTableItem) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Actions"
                data-test-subj={`serviceActionsButton-${item.serviceName}`}
              >
                <span className="oui:text-base">⋯</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onServiceClick?.(item.serviceName, item.environment)}
              >
                <span className="oui:mr-2">👁</span>
                View service details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                <span className="oui:mr-2">📋</span>
                View traces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onServiceClick]
  );

  // EUI fallback columns
  const euiColumns: Array<EuiBasicTableColumn<ServiceTableItem>> = useMemo(
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

  return USE_OUI_V2 ? (
    <OUI2Wrapper>
      <div className="oui:min-h-screen oui:bg-gray-50" data-test-subj="servicesPage">
        <div className="oui:mx-auto oui:max-w-screen-2xl oui:p-6">
          {/* Top Filter Bar */}
          <FilterBar
            items={services}
            timeRange={timeRange}
            onFilteredItems={handleFilteredItems}
            onTimeChange={handleTimeChange}
            onRefresh={handleRefresh}
          />

          <div className="oui:h-4" />

          {/* Main content with side drawer */}
          <div className="oui:flex oui:flex-row oui:gap-2">
              {/* Left Side Drawer */}
              <div className={filterDrawerOpen ? "oui:w-64 oui:shrink-0" : "oui:w-auto oui:shrink-0"}>
                {filterDrawerOpen ? (
                  <Card className="oui:h-fit">
                    <CardHeader>
                      <div className="oui:flex oui:items-center oui:justify-between">
                        <CardTitle>Filters</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFilterDrawerOpen(false)}
                          data-test-subj="filter-drawer-close"
                          aria-label="Close filter drawer"
                          className="oui:h-6 oui:w-6"
                        >
                          <span className="oui:text-lg">←</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent>

                    {/* Environment Filter - Accordion */}
                    <Accordion type="single" defaultValue="environment" collapsible>
                      <AccordionItem value="environment">
                        <AccordionTrigger className="oui:text-sm oui:font-semibold">
                          Environment
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="oui:space-y-3">
                            {/* Select all / Clear all links */}
                            {environmentCheckboxes.length > 0 && (
                              <div className="oui:flex oui:justify-between oui:items-center">
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={handleSelectAllEnvironments}
                                  data-test-subj="environment-selectAll"
                                  className="oui:h-auto oui:p-0 oui:text-xs"
                                >
                                  Select all
                                </Button>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={handleClearAllEnvironments}
                                  data-test-subj="environment-clearAll"
                                  className="oui:h-auto oui:p-0 oui:text-xs"
                                >
                                  Clear all
                                </Button>
                              </div>
                            )}

                            {/* Checkbox group */}
                            {environmentCheckboxes.length > 0 ? (
                              <div className="oui:space-y-2">
                                {environmentCheckboxes.map((option) => (
                                  <div key={option.id} className="oui:flex oui:items-center oui:space-x-2">
                                    <Checkbox
                                      id={option.id}
                                      checked={selectedEnvironments[option.id] || false}
                                      onCheckedChange={(checked) => {
                                        onEnvironmentChange(option.id);
                                      }}
                                    />
                                    <label
                                      htmlFor={option.id}
                                      className="oui:text-sm oui:font-medium oui:leading-none oui:cursor-pointer"
                                    >
                                      {option.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="oui:text-sm oui:text-gray-600">
                                No environments available
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Dynamic GroupByAttributes Filters - Accordion Structure */}
                    {availableGroupByAttributes &&
                      Object.keys(availableGroupByAttributes).length > 0 && (
                        <div className="oui:mt-4">
                          <Accordion type="single" defaultValue="attributes" collapsible>
                            <AccordionItem value="attributes">
                              <AccordionTrigger className="oui:text-sm oui:font-semibold">
                                Attributes
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="oui:space-y-4">
                                  {/* Inner accordions for each attribute */}
                                  <Accordion type="multiple" className="oui:space-y-2">
                                    {Object.entries(availableGroupByAttributes).map(
                                      ([attrPath, _values]) => {
                                        const filteredValues = filteredAttributeValues[attrPath] || [];
                                        const searchQuery = attributeSearchQueries[attrPath] || '';

                                        return (
                                          <AccordionItem key={attrPath} value={attrPath}>
                                            <AccordionTrigger className="oui:text-xs oui:font-semibold">
                                              {attrPath}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="oui:space-y-3">
                                                {/* Search box */}
                                                <Input
                                                  type="search"
                                                  placeholder={`Search ${attrPath}`}
                                                  value={searchQuery}
                                                  onChange={(e) =>
                                                    handleSearchChange(attrPath, e.target.value)
                                                  }
                                                  className="oui:h-8 oui:text-sm"
                                                  data-test-subj={`attribute-${attrPath}-search`}
                                                />

                                                {/* Select all / Clear all links */}
                                                {filteredValues.length > 0 && (
                                                  <div className="oui:flex oui:justify-between oui:items-center">
                                                    <Button
                                                      variant="link"
                                                      size="sm"
                                                      onClick={() =>
                                                        handleSelectAllForAttribute(attrPath)
                                                      }
                                                      data-test-subj={`attribute-${attrPath}-selectAll`}
                                                      className="oui:h-auto oui:p-0 oui:text-xs"
                                                    >
                                                      Select all
                                                    </Button>
                                                    <Button
                                                      variant="link"
                                                      size="sm"
                                                      onClick={() => handleClearAllForAttribute(attrPath)}
                                                      data-test-subj={`attribute-${attrPath}-clearAll`}
                                                      className="oui:h-auto oui:p-0 oui:text-xs"
                                                    >
                                                      Clear all
                                                    </Button>
                                                  </div>
                                                )}

                                                {/* Checkbox list */}
                                                {filteredValues.length > 0 ? (
                                                  <div className="oui:space-y-2">
                                                    {filteredValues.map((value) => (
                                                      <div key={value} className="oui:flex oui:items-center oui:space-x-2">
                                                        <Checkbox
                                                          id={`${attrPath}-${value}`}
                                                          checked={selectedGroupByAttributes[attrPath]?.[value] || false}
                                                          onCheckedChange={(checked) => {
                                                            setSelectedGroupByAttributes((prev) => ({
                                                              ...prev,
                                                              [attrPath]: {
                                                                ...(prev[attrPath] || {}),
                                                                [value]: !!checked,
                                                              },
                                                            }));
                                                          }}
                                                        />
                                                        <label
                                                          htmlFor={`${attrPath}-${value}`}
                                                          className="oui:text-sm oui:font-medium oui:leading-none oui:cursor-pointer"
                                                        >
                                                          {value}
                                                        </label>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <p className="oui:text-sm oui:text-gray-600">
                                                    No matching values
                                                  </p>
                                                )}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        );
                                      }
                                    )}
                                  </Accordion>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="oui:flex oui:items-start">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFilterDrawerOpen(true)}
                      data-test-subj="filter-drawer-open"
                      aria-label="Open filter drawer"
                      className="oui:h-10 oui:w-10 oui:rounded-md oui:border-gray-300 oui:bg-white oui:shadow-sm hover:oui:bg-gray-50"
                    >
                      <span className="oui:text-lg oui:font-bold">→</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Main Content */}
              <div className="oui:flex-1 oui:min-w-0">
                {/* Top Widgets Row */}
                <div className="oui:grid oui:grid-cols-2 oui:gap-4">
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
                </div>

                <div className="oui:h-4" />

                {/* Services Table Section */}
                {error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error loading services</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ) : isLoading ? (
                  <ServicesTableSkeleton rows={pageSize} />
                ) : !services || services.length === 0 ? (
                  <OuiEmptyState
                    title="No services found"
                    body="No services detected in the selected time range. Services will appear here once they start sending telemetry data."
                    iconType="search"
                  />
                ) : fullyFilteredItems.length === 0 ? (
                  <OuiEmptyState
                    title="No matching services"
                    body="Try adjusting your search query or time range to find services."
                    iconType="search"
                  />
                ) : (
                  <Card className="oui:w-full oui:overflow-hidden">
                    <CardContent className="oui:p-0">
                      <div className="oui:overflow-x-auto oui:bg-white">
                        <div className="oui:inline-block oui:bg-white">
                          <OuiTable
                            items={fullyFilteredItems.slice(
                              pageIndex * pageSize,
                              (pageIndex + 1) * pageSize
                            )}
                            columns={ouiColumns}
                            sorting={sorting}
                            onChange={onTableChange}
                            tableLayout="auto"
                          />
                        </div>
                      </div>
                      {/* Pagination Controls */}
                      <div className="oui:flex oui:items-center oui:justify-between oui:border-t oui:border-gray-200 oui:bg-white oui:px-4 oui:py-3">
                        <div className="oui:flex oui:items-center oui:gap-2">
                          <span className="oui:text-sm oui:text-gray-700">Rows per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setPageIndex(0);
                            }}
                            className="oui:rounded-md oui:border oui:border-gray-300 oui:px-2 oui:py-1 oui:text-sm focus:oui:border-blue-500 focus:oui:outline-none focus:oui:ring-1 focus:oui:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <div className="oui:flex oui:items-center oui:gap-4">
                          <span className="oui:text-sm oui:text-gray-700">
                            {pageIndex * pageSize + 1}-
                            {Math.min((pageIndex + 1) * pageSize, fullyFilteredItems.length)} of{' '}
                            {fullyFilteredItems.length}
                          </span>
                          <div className="oui:flex oui:gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPageIndex(pageIndex - 1)}
                              disabled={pageIndex === 0}
                              aria-label="Previous page"
                            >
                              ←
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPageIndex(pageIndex + 1)}
                              disabled={(pageIndex + 1) * pageSize >= fullyFilteredItems.length}
                              aria-label="Next page"
                            >
                              →
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </OUI2Wrapper>
    ) : (
      <EuiPage data-test-subj="servicesPage">
        <EuiPageBody component="main">
          <EuiPageContent color="transparent" hasBorder={false} paddingSize="none">
            <EuiPageContentBody>
              {/* EUI fallback - keeping original structure */}
              <FilterBar
                items={services}
                timeRange={timeRange}
                onFilteredItems={handleFilteredItems}
                onTimeChange={handleTimeChange}
                onRefresh={handleRefresh}
              />
              <EuiSpacer size="s" />
              <EuiFlexGroup direction="row" gutterSize="s">
                {filterDrawerOpen && (
                  <EuiFlexItem grow={false}>
                    <EuiPanel style={{ width: 250 }}>
                      <p>EUI Fallback - filters not yet migrated</p>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <p>EUI Fallback - content not yet migrated</p>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
};
