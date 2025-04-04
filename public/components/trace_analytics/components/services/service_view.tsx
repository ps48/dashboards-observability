/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable react-hooks/exhaustive-deps */

import dateMath from '@elastic/datemath';
import {
  EuiBadge,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiLink,
  EuiLoadingContent,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiPopover,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import round from 'lodash/round';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataSourceManagementPluginSetup } from '../../../../../../../src/plugins/data_source_management/public';
import { DataSourceOption } from '../../../../../../../src/plugins/data_source_management/public/components/data_source_menu/types';
import {
  DEFAULT_DATA_SOURCE_NAME,
  DEFAULT_DATA_SOURCE_TYPE,
} from '../../../../../common/constants/data_sources';
import {
  observabilityLogsID,
  observabilityTracesNewNavID,
} from '../../../../../common/constants/shared';
import { TRACE_ANALYTICS_DATE_FORMAT } from '../../../../../common/constants/trace_analytics';
import { setNavBreadCrumbs } from '../../../../../common/utils/set_nav_bread_crumbs';
import { coreRefs } from '../../../../framework/core_refs';
import { HeaderControlledComponentsWrapper } from '../../../../plugin_helpers/plugin_headerControl';
import { TraceAnalyticsComponentDeps } from '../../home';
import { handleServiceViewRequest } from '../../requests/services_request_handler';
import { TraceFilter } from '../common/constants';
import { FilterType } from '../common/filters/filters';
import {
  PanelTitle,
  TraceSettings,
  filtersToDsl,
  generateServiceUrl,
  processTimeStamp,
} from '../common/helper_functions';
import { ServiceMap, ServiceObject } from '../common/plots/service_map';
import { SearchBarProps, renderDatePicker } from '../common/search_bar';
import { SpanDetailFlyout } from '../traces/span_detail_flyout';
import { SpanDetailTable } from '../traces/span_detail_table';
import { ServiceMetrics } from './service_metrics';

interface ServiceViewProps extends TraceAnalyticsComponentDeps {
  serviceName: string;
  addFilter: (filter: FilterType) => void;
  dataSourceMDSId: DataSourceOption[];
  dataSourceManagement: DataSourceManagementPluginSetup;
  dataSourceEnabled: boolean;
  page?: string;
  setCurrentSelectedService?: React.Dispatch<React.SetStateAction<string>>;
}

export function ServiceView(props: ServiceViewProps) {
  const { mode, page, setCurrentSelectedService } = props;
  const [fields, setFields] = useState<any>({});
  const [serviceMap, setServiceMap] = useState<ServiceObject>({});
  const [serviceMapIdSelected, setServiceMapIdSelected] = useState<
    'latency' | 'error_rate' | 'throughput'
  >('latency');
  const [redirect, setRedirect] = useState(false);
  const [actionsMenuPopover, setActionsMenuPopover] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const location = useLocation();
  const [isServiceOverviewLoading, setIsServiceOverviewLoading] = useState(false);
  const [isServicesDataLoading, setIsServicesDataLoading] = useState(false);
  const newNavigation = coreRefs.chrome?.navGroup.getNavGroupEnabled();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location?.search || '');
      const id = params.get('serviceId');
      setServiceId(id);
    } catch (error) {
      setServiceId(null);
    }
  }, [location]);

  const hideSearchBarCheck = page === 'serviceFlyout' || serviceId !== '';

  const refresh = () => {
    const DSL = filtersToDsl(
      mode,
      props.filters,
      props.query,
      processTimeStamp(props.startTime, mode),
      processTimeStamp(props.endTime, mode)
    );

    setIsServiceOverviewLoading(true);
    setIsServicesDataLoading(true);
    handleServiceViewRequest(
      props.serviceName,
      props.http,
      DSL,
      setFields,
      mode,
      setServiceMap,
      props.dataSourceMDSId[0].id
    ).finally(() => {
      setIsServiceOverviewLoading(false);
      setIsServicesDataLoading(false);
    });
  };

  useEffect(() => {
    if (page !== 'serviceFlyout')
      setNavBreadCrumbs(
        [
          props.parentBreadcrumb,
          {
            text: 'Trace analytics',
            href: '#/traces',
          },
        ],
        [
          {
            text: 'Services',
            href: '#/services',
          },
          {
            text: props.serviceName,
            href: generateServiceUrl(props.serviceName, props.dataSourceMDSId[0].id),
          },
        ]
      );
    props.setDataSourceMenuSelectable?.(false);
  }, [props.serviceName, props.setDataSourceMenuSelectable]);

  const redirectToServicePage = (service: string) => {
    window.location.href = generateServiceUrl(service, props.dataSourceMDSId[0].id, mode);
  };

  const onClickConnectedService = (service: string) => {
    if (page !== 'serviceFlyout') redirectToServicePage(service);
    else if (setCurrentSelectedService) setCurrentSelectedService(service);
  };

  const redirectToServiceTraces = () => {
    if (setCurrentSelectedService) setCurrentSelectedService('');
    setRedirect(true);
    const filterField =
      mode === 'data_prepper' || mode === 'custom_data_prepper'
        ? 'serviceName'
        : 'process.serviceName';
    props.addFilter({
      field: filterField,
      operator: 'is',
      value: props.serviceName,
      inverted: false,
      disabled: false,
    });

    const tracesPath = '#/traces';
    const dataSourceId = props.dataSourceMDSId[0]?.id || '';
    const urlParts = window.location.href.split('?');
    const queryParams =
      urlParts.length > 1 ? new URLSearchParams(urlParts[1]) : new URLSearchParams();

    const modeParam = queryParams.get('mode') || '';
    const modeQuery = modeParam ? `&mode=${encodeURIComponent(modeParam)}` : '';

    if (newNavigation) {
      coreRefs.application?.navigateToApp(observabilityTracesNewNavID, {
        path: `${tracesPath}?datasourceId=${encodeURIComponent(dataSourceId)}${modeQuery}`,
      });
    } else {
      window.location.assign(
        `${tracesPath}?datasourceId=${encodeURIComponent(dataSourceId)}${modeQuery}`
      );
    }
  };

  useEffect(() => {
    if (!redirect) refresh();
  }, [props.startTime, props.endTime, props.serviceName, props.mode]);

  const actionsButton = (
    <EuiSmallButton
      data-test-subj="ActionContextMenu"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setActionsMenuPopover(!actionsMenuPopover)}
    >
      Actions
    </EuiSmallButton>
  );

  const actionsMenu: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        ...(mode === 'data_prepper' || mode === 'custom_data_prepper'
          ? [
              {
                name: 'View logs',
                'data-test-subj': 'viewLogsButton',
                onClick: () => {
                  const correlatedLogsIndex = TraceSettings.getCorrelatedLogsIndex();
                  const correlatedServiceNameField = TraceSettings.getCorrelatedLogsFieldMappings()
                    .serviceName;
                  const correlatedTimestampField = TraceSettings.getCorrelatedLogsFieldMappings()
                    .timestamp;
                  // NOTE: Discover has issue with PPL Time filter, hence adding +3/-3 days to actual timestamp
                  const startTime =
                    dateMath
                      .parse(props.startTime)!
                      .subtract(3, 'days')
                      .format(TRACE_ANALYTICS_DATE_FORMAT) ?? 'now-3y';
                  const endTime =
                    dateMath
                      .parse(props.endTime, { roundUp: true })!
                      .add(3, 'days')
                      .format(TRACE_ANALYTICS_DATE_FORMAT) ?? 'now';
                  if (coreRefs?.dataSource?.dataSourceEnabled) {
                    coreRefs?.application!.navigateToApp('data-explorer', {
                      path: `discover#?_a=(discover:(columns:!(_source),isDirty:!f,sort:!()),metadata:(view:discover))&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${startTime}',to:'${endTime}'))&_q=(filters:!(),query:(dataset:(dataSource:(id:'${
                        props.dataSourceMDSId[0].id ?? ''
                      }',title:'${props.dataSourceMDSId[0].label}',type:DATA_SOURCE),id:'${
                        props.dataSourceMDSId[0].id ?? ''
                      }::${correlatedLogsIndex}',timeFieldName:'${correlatedTimestampField}',title:'${correlatedLogsIndex}',type:INDEXES),language:PPL,query:'source%20%3D%20${correlatedLogsIndex}%20%7C%20where%20${correlatedServiceNameField}%20%3D%20%22${
                        props.serviceName
                      }%22'))`,
                    });
                  } else {
                    coreRefs?.application!.navigateToApp(observabilityLogsID, {
                      path: `#/explorer`,
                      state: {
                        DEFAULT_DATA_SOURCE_NAME,
                        DEFAULT_DATA_SOURCE_TYPE,
                        queryToRun: `source = ${correlatedLogsIndex} | where ${correlatedServiceNameField}='${props.serviceName}'`,
                        timestampField: correlatedTimestampField,
                        startTimeRange: props.startTime,
                        endTimeRange: props.endTime,
                      },
                    });
                  }
                },
              },
            ]
          : []),
        {
          name: 'View traces',
          'data-test-subj': 'viewTracesButton',
          onClick: redirectToServiceTraces,
        },
        {
          name: 'Expand view',
          'data-test-subj': 'viewServiceButton',
          onClick: () => {
            if (setCurrentSelectedService) setCurrentSelectedService('');
            redirectToServicePage(props.serviceName);
          },
        },
      ],
    },
  ];

  const serviceHeader = (
    <EuiText size="s">
      <h1 className="overview-content">{props.serviceName}</h1>
    </EuiText>
  );

  const renderTitle = (
    serviceName: string,
    startTime: SearchBarProps['startTime'],
    setStartTime: SearchBarProps['setStartTime'],
    endTime: SearchBarProps['endTime'],
    setEndTime: SearchBarProps['setEndTime'],
    _addFilter: (filter: FilterType) => void,
    _page?: string
  ) => {
    return (
      <>
        {_page === 'serviceFlyout' ? (
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>{serviceHeader}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={true}>
                {renderDatePicker(startTime, setStartTime, endTime, setEndTime)}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  panelPaddingSize="none"
                  button={actionsButton}
                  isOpen={actionsMenuPopover}
                  closePopover={() => setActionsMenuPopover(false)}
                >
                  <EuiContextMenu initialPanelId={0} panels={actionsMenu} size="s" />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
        ) : coreRefs?.chrome?.navGroup.getNavGroupEnabled() ? (
          <HeaderControlledComponentsWrapper
            components={[renderDatePicker(startTime, setStartTime, endTime, setEndTime)]}
          />
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>{serviceHeader}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              {renderDatePicker(startTime, setStartTime, endTime, setEndTime)}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  };

  const renderOverview = () => {
    return (
      <>
        <EuiPanel>
          <PanelTitle title="Overview" />
          {isServiceOverviewLoading ? (
            <div>
              <EuiLoadingContent lines={4} />
            </div>
          ) : (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiText className="overview-title">Name</EuiText>
                      <EuiText size="s" className="overview-content">
                        {props.serviceName || '-'}
                      </EuiText>
                    </EuiFlexItem>
                    {mode === 'data_prepper' || mode === 'custom_data_prepper' ? (
                      <EuiFlexItem grow={false}>
                        <EuiText className="overview-title">Number of connected services</EuiText>
                        <EuiText size="s" className="overview-content">
                          {fields.number_of_connected_services !== undefined
                            ? fields.number_of_connected_services
                            : 0}
                        </EuiText>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem />
                    )}
                    {mode === 'data_prepper' || mode === 'custom_data_prepper' ? (
                      <EuiFlexItem grow={false}>
                        <EuiText className="overview-title">Connected services</EuiText>
                        <EuiText size="s" className="overview-content">
                          {fields.connected_services && fields.connected_services.length
                            ? fields.connected_services
                                .map((service: string) => (
                                  <EuiLink
                                    onClick={() => onClickConnectedService(service)}
                                    key={service}
                                  >
                                    {service}
                                  </EuiLink>
                                ))
                                .reduce((prev: React.ReactNode, curr: React.ReactNode) => {
                                  return [prev, ', ', curr];
                                })
                            : '-'}
                        </EuiText>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem />
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiText className="overview-title">Average duration (ms)</EuiText>
                      <EuiText size="s" className="overview-content">
                        {fields.average_latency !== undefined ? fields.average_latency : '-'}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText className="overview-title">Error rate</EuiText>
                      <EuiText size="s" className="overview-content">
                        {fields.error_rate !== undefined
                          ? round(fields.error_rate, 2).toString() + '%'
                          : '-'}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText className="overview-title">Request rate</EuiText>
                      <EuiText size="s" className="overview-content">
                        {fields.throughput !== undefined ? (
                          <EuiI18nNumber value={fields.throughput} />
                        ) : (
                          '-'
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText className="overview-title">Traces</EuiText>
                      <EuiText size="s" className="overview-content">
                        {fields.traces === 0 || fields.traces ? (
                          <EuiLink onClick={redirectToServiceTraces}>
                            <EuiI18nNumber value={fields.traces} />
                          </EuiLink>
                        ) : (
                          '-'
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
            </>
          )}
        </EuiPanel>
      </>
    );
  };

  const overview = useMemo(() => renderOverview(), [
    fields,
    isServiceOverviewLoading,
    props.serviceName,
  ]);

  const title = useMemo(
    () =>
      renderTitle(
        props.serviceName,
        props.startTime,
        props.setStartTime,
        props.endTime,
        props.setEndTime,
        props.addFilter,
        page
      ),
    [props.serviceName, props.startTime, props.endTime, page, actionsMenuPopover]
  );

  const activeFilters = useMemo(
    () => props.filters.filter((filter) => !filter.locked && !filter.disabled),
    [props.filters]
  );

  const [currentSpan, setCurrentSpan] = useState('');
  const storedFilters = sessionStorage.getItem('TraceAnalyticsSpanFilters');
  const [spanFilters, setSpanFilters] = useState<TraceFilter[]>(
    storedFilters ? JSON.parse(storedFilters) : []
  );
  const [DSL, setDSL] = useState<any>({});

  const setSpanFiltersWithStorage = (newFilters: TraceFilter[]) => {
    setSpanFilters(newFilters);
    sessionStorage.setItem('TraceAnalyticsSpanFilters', JSON.stringify(newFilters));
  };

  useEffect(() => {
    const spanDSL = filtersToDsl(
      mode,
      props.filters,
      props.query,
      processTimeStamp(props.startTime, mode),
      processTimeStamp(props.endTime, mode)
    );
    if (mode === 'data_prepper' || mode === 'custom_data_prepper') {
      spanDSL.query.bool.filter.push({
        term: {
          serviceName: props.serviceName,
        },
      });
    } else if (mode === 'jaeger') {
      spanDSL.query.bool.filter.push({
        term: {
          'process.serviceName': props.serviceName,
        },
      });
    }
    spanFilters.map(({ field, value }) => {
      if (value != null) {
        spanDSL.query.bool.filter.push({
          term: {
            [field]: value,
          },
        });
      }
    });
    setDSL(spanDSL);
  }, [props.startTime, props.endTime, props.serviceName, spanFilters]);

  const addSpanFilter = (field: string, value: any) => {
    const newFilters = [...spanFilters];
    const index = newFilters.findIndex(({ field: filterField }) => field === filterField);
    if (index === -1) {
      newFilters.push({ field, value });
    } else {
      newFilters.splice(index, 1, { field, value });
    }
    setSpanFiltersWithStorage(newFilters);
  };

  const removeSpanFilter = (field: string) => {
    const newFilters = [...spanFilters];
    const index = newFilters.findIndex(({ field: filterField }) => field === filterField);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setSpanFiltersWithStorage(newFilters);
    }
  };

  const renderFilters = useMemo(() => {
    return spanFilters.map(({ field, value }) => (
      <EuiFlexItem grow={false} key={`span-filter-badge-${field}`}>
        <EuiBadge
          iconType="cross"
          iconSide="right"
          iconOnClick={() => removeSpanFilter(field)}
          iconOnClickAriaLabel="remove current filter"
        >
          {`${field}: ${value}`}
        </EuiBadge>
      </EuiFlexItem>
    ));
  }, [spanFilters]);

  const [total, setTotal] = useState(0);
  const spanDetailTable = useMemo(() => {
    // only render when time and service state updates in DSL
    if (Object.keys(DSL).length > 0)
      return (
        <SpanDetailTable
          http={props.http}
          hiddenColumns={['serviceName']}
          DSL={DSL}
          openFlyout={(spanId: string) => setCurrentSpan(spanId)}
          setTotal={setTotal}
          mode={mode}
          dataSourceMDSId={props.dataSourceMDSId[0].id}
        />
      );
    return <></>;
  }, [DSL, setCurrentSpan, spanFilters]);

  const pageToRender = (
    <>
      {activeFilters.length > 0 && (
        <EuiText textAlign="right" style={{ marginRight: 20 }} color="subdued">
          results are filtered by {activeFilters.map((filter) => filter.field).join(', ')}
        </EuiText>
      )}
      <EuiSpacer size="m" />
      {overview}

      {mode === 'data_prepper' || mode === 'custom_data_prepper' ? (
        <>
          <EuiSpacer />
          <ServiceMetrics
            serviceName={props.serviceName}
            mode={mode}
            dataSourceMDSId={props.dataSourceMDSId}
            setStartTime={props.setStartTime}
            setEndTime={props.setEndTime}
            page={props.page}
          />
          <EuiSpacer />
          <ServiceMap
            serviceMap={serviceMap}
            isServicesDataLoading={isServicesDataLoading}
            idSelected={serviceMapIdSelected}
            setIdSelected={setServiceMapIdSelected}
            currService={props.serviceName}
            page="serviceView"
            filterByCurrService={true}
            mode={mode}
            hideSearchBar={hideSearchBarCheck}
          />
        </>
      ) : (
        <div />
      )}
      <EuiSpacer />
      <EuiPanel>
        <PanelTitle title="Spans" totalItems={total} />
        {spanFilters.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" wrap>
              {renderFilters}
            </EuiFlexGroup>
          </>
        )}
        <EuiHorizontalRule margin="m" />
        <div>{spanDetailTable}</div>
      </EuiPanel>
    </>
  );

  return (
    <>
      {page === 'serviceFlyout' ? (
        !!currentSpan ? (
          <SpanDetailFlyout
            http={props.http}
            spanId={currentSpan}
            isFlyoutVisible={!!currentSpan}
            closeFlyout={() => {
              setCurrentSpan('');
              if (props.setCurrentSelectedService) props.setCurrentSelectedService('');
            }}
            addSpanFilter={addSpanFilter}
            mode={mode}
            serviceName={props.serviceName}
            dataSourceMDSId={props.dataSourceMDSId[0].id}
            dataSourceMDSLabel={props.dataSourceMDSId[0].label}
            startTime={props.startTime}
            endTime={props.endTime}
            setCurrentSpan={setCurrentSpan}
          />
        ) : (
          <EuiFlyout
            ownFocus
            onClose={() => props.setCurrentSelectedService && props.setCurrentSelectedService('')}
            paddingSize="l"
          >
            {title}
            <EuiFlyoutBody>{pageToRender}</EuiFlyoutBody>
          </EuiFlyout>
        )
      ) : (
        <EuiPage>
          <EuiPageBody>
            {title}
            {pageToRender}
            {!!currentSpan && (
              <SpanDetailFlyout
                http={props.http}
                spanId={currentSpan}
                isFlyoutVisible={!!currentSpan}
                closeFlyout={() => setCurrentSpan('')}
                addSpanFilter={addSpanFilter}
                mode={mode}
                dataSourceMDSId={props.dataSourceMDSId[0].id}
                dataSourceMDSLabel={props.dataSourceMDSId[0].label}
              />
            )}
          </EuiPageBody>
        </EuiPage>
      )}
    </>
  );
}
