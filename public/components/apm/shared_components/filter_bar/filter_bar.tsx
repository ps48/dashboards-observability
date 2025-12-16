/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PropertyFilter } from '../property_filter';
import { TimeRangePicker } from '../time_filter';
import { ServiceTableItem, TimeRange } from '../../services/types';

export interface FilterBarProps {
  items: ServiceTableItem[];
  timeRange: TimeRange;
  onFilteredItems: (filteredItems: ServiceTableItem[]) => void;
  onTimeChange: (timeRange: TimeRange) => void;
  onRefresh?: () => void;
  isTimePickerDisabled?: boolean;
}

/**
 * Unified filter bar combining property filter and time range picker
 *
 * Layout: [Property Filter (left, grow)] [Time Picker (right, fixed)]
 *
 * This component provides a consistent filtering experience across
 * APM pages with both text search and time range selection.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  items,
  timeRange,
  onFilteredItems,
  onTimeChange,
  onRefresh,
  isTimePickerDisabled = false,
}) => {
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" data-test-subj="apmFilterBar">
      <EuiFlexItem grow={true}>
        <PropertyFilter items={items} onFilteredItems={onFilteredItems} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TimeRangePicker
          timeRange={timeRange}
          onChange={onTimeChange}
          onRefresh={onRefresh}
          isDisabled={isTimePickerDisabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
