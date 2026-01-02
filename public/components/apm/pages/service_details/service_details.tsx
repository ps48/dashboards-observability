/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiTabs,
  EuiTab,
  EuiSpacer,
} from '@elastic/eui';
import { ServiceOverview } from './service_overview';
import { ServiceOperations } from './service_operations';
import { ServiceDependencies } from './service_dependencies';
import { ApmPageHeader } from '../../shared_components/apm_page_header';
import { TimeRange } from '../../services/types';
import { DEFAULT_TOPOLOGY_INDEX, DEFAULT_PROMETHEUS_CONNECTION_NAME } from '../../utils/config';

export interface ServiceDetailsProps {
  serviceName: string;
  environment?: string;
  initialTab?: 'overview' | 'operations' | 'dependencies';
  queryIndex?: string;
  prometheusConnectionId?: string;
  onBack?: () => void;
  chrome?: any;
  parentBreadcrumb?: any;
}

type TabId = 'overview' | 'operations' | 'dependencies';

const tabs = [
  {
    id: 'overview' as TabId,
    name: 'Overview',
    disabled: false,
  },
  {
    id: 'operations' as TabId,
    name: 'Operations',
    disabled: false,
  },
  {
    id: 'dependencies' as TabId,
    name: 'Dependencies',
    disabled: false,
  },
];

/**
 * ServiceDetails - Main page for viewing service details
 *
 * Provides tabbed navigation between:
 * - Overview (RED metrics)
 * - Operations (endpoint/method list)
 * - Dependencies (upstream/downstream services)
 */
export const ServiceDetails: React.FC<ServiceDetailsProps> = ({
  serviceName,
  environment,
  initialTab = 'overview',
  queryIndex,
  prometheusConnectionId,
  onBack: _onBack,
  chrome,
  parentBreadcrumb,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<TabId>(initialTab);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set breadcrumbs and page header
  React.useEffect(() => {
    if (chrome && parentBreadcrumb) {
      chrome.setBreadcrumbs([
        parentBreadcrumb,
        {
          text: 'Services',
          href: '#/services',
        },
        {
          text: serviceName,
        },
      ]);
    }
  }, [chrome, parentBreadcrumb, serviceName, environment]);

  // Use config defaults if not provided
  const effectiveQueryIndex = queryIndex || DEFAULT_TOPOLOGY_INDEX;
  const effectivePrometheusConnection =
    prometheusConnectionId || DEFAULT_PROMETHEUS_CONNECTION_NAME;

  const onSelectedTabChanged = useCallback((id: TabId) => {
    setSelectedTabId(id);
  }, []);

  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const renderTabs = () =>
    tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        data-test-subj={`serviceDetailsTab-${tab.id}`}
      >
        {tab.name}
      </EuiTab>
    ));

  const renderTabContent = () => {
    switch (selectedTabId) {
      case 'overview':
        return (
          <ServiceOverview
            serviceName={serviceName}
            environment={environment}
            timeRange={timeRange}
            queryIndex={effectiveQueryIndex}
            prometheusConnectionId={effectivePrometheusConnection}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'operations':
        return (
          <ServiceOperations
            serviceName={serviceName}
            environment={environment}
            timeRange={timeRange}
            queryIndex={effectiveQueryIndex}
            prometheusConnectionId={effectivePrometheusConnection}
            refreshTrigger={refreshTrigger}
            onTimeChange={handleTimeRangeChange}
            onRefresh={handleRefresh}
          />
        );
      case 'dependencies':
        return (
          <ServiceDependencies
            serviceName={serviceName}
            environment={environment}
            timeRange={timeRange}
            queryIndex={effectiveQueryIndex}
            prometheusConnectionId={effectivePrometheusConnection}
            refreshTrigger={refreshTrigger}
            onTimeChange={handleTimeRangeChange}
            onRefresh={handleRefresh}
          />
        );
      default:
        return null;
    }
  };

  return (
    <EuiPage data-test-subj="serviceDetailsPage">
      <EuiPageBody>
        <EuiPageContent color="transparent" hasBorder={false} paddingSize="none">
          <EuiPageContentBody>
            {/* Time filter in page header */}
            <ApmPageHeader
              timeRange={timeRange}
              onTimeChange={handleTimeRangeChange}
              onRefresh={handleRefresh}
            />

            {/* Tabs */}
            <EuiTabs>{renderTabs()}</EuiTabs>

            <EuiSpacer size="l" />

            {/* Tab Content */}
            {renderTabContent()}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
