/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { HttpSetup } from '../../../../../../src/core/public';
import { ServiceTableItem, ParsedTimeRange, TimeRange } from './types';
import { PropertyFilter } from '../shared/components/property_filter';
import { ServicesTable } from './services_table';
import { TopServicesWidget } from './top_services_widget';
import { EmptyState } from '../shared/components/empty_state';
import { useServiceData } from '../shared/hooks/use_service_data';
import { DEFAULT_PROMETHEUS_CONNECTION_ID } from '../../../../common/constants/apm_config';

interface EmbeddableFactoryStart {
  getEmbeddableFactory: (type: string) => any;
}

interface ServicesContentProps {
  http: HttpSetup;
  embeddable: EmbeddableFactoryStart;
  timeRange: ParsedTimeRange;
  dataSourceId?: string;
  prometheusConnectionId?: string;
  timeRangeState: TimeRange;
  onTimeChange: (props: OnTimeChangeProps) => void;
}

/**
 * Main services content component that orchestrates:
 * - Property filter for searching
 * - Services table with data
 * - TOP-K fault rate widget
 */
export const ServicesContent: React.FC<ServicesContentProps> = ({
  http,
  embeddable,
  timeRange,
  dataSourceId = 'default',
  prometheusConnectionId = DEFAULT_PROMETHEUS_CONNECTION_ID,
  timeRangeState,
  onTimeChange,
}) => {
  const [filteredItems, setFilteredItems] = useState<ServiceTableItem[]>([]);

  // Fetch services data using PPL query
  const { tableItems, isLoading, error } = useServiceData({
    http,
    timeRange,
    dataSourceId,
  });

  // Handle filtered items from property filter
  const handleFilteredItems = useCallback((items: ServiceTableItem[]) => {
    setFilteredItems(items);
  }, []);

  // Error state
  if (error) {
    return (
      <EmptyState
        isError
        title="Error loading services"
        body="There was an error loading the services data. Please check your data source connection and try again."
      />
    );
  }

  // Empty state (no services found after data loaded)
  if (!isLoading && tableItems.length === 0) {
    return (
      <EmptyState
        title="No services found"
        body="No services were found in the selected time range. Try adjusting your time range or check your data source."
      />
    );
  }

  return (
    <>
      {/* Filter Bar and Time Range Picker on same line */}
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={true}>
          <PropertyFilter items={tableItems} onFilteredItems={handleFilteredItems} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={timeRangeState.from}
            end={timeRangeState.to}
            onTimeChange={onTimeChange}
            showUpdateButton={true}
            data-test-subj="apmServicesDatePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Main Content Area */}
      <EuiFlexGroup direction="column" gutterSize="l">
        {/* TOP-K Fault Count Widget */}
        <EuiFlexItem grow={false}>
          <TopServicesWidget
            embeddable={embeddable}
            timeRange={{
              from: timeRange.startTime.toISOString(),
              to: timeRange.endTime.toISOString(),
            }}
            prometheusConnectionId={prometheusConnectionId}
            isLoading={isLoading}
          />
        </EuiFlexItem>

        {/* Services Table */}
        <EuiFlexItem>
          {filteredItems.length === 0 && !isLoading ? (
            <EmptyState
              title="No matching services"
              body="No services match your search criteria. Try adjusting your filter."
            />
          ) : (
            <ServicesTable items={filteredItems} isLoading={isLoading} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
