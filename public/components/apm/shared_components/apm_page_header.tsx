/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { HeaderControlledComponentsWrapper } from '../../../../public/plugin_helpers/plugin_headerControl';
import { TimeRangePicker } from './time_filter';
import { TimeRange } from '../services/types';

export interface ApmPageHeaderProps {
  timeRange: TimeRange;
  onTimeChange: (timeRange: TimeRange) => void;
  onRefresh: () => void;
}

/**
 * ApmPageHeader - Shared header component for all APM pages
 *
 * Places time range picker in the page header (breadcrumb area)
 * consistent across all APM pages.
 */
export const ApmPageHeader: React.FC<ApmPageHeaderProps> = ({
  timeRange,
  onTimeChange,
  onRefresh,
}) => {
  return (
    <HeaderControlledComponentsWrapper
      components={[
        <EuiFlexItem grow={false} key="time-picker">
          <TimeRangePicker timeRange={timeRange} onChange={onTimeChange} onRefresh={onRefresh} />
        </EuiFlexItem>,
      ]}
    />
  );
};
