/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { EuiPage, EuiPageBody, OnTimeChangeProps } from '@elastic/eui';
import { ChromeBreadcrumb, HttpSetup } from '../../../../../src/core/public';
import { ServicesContent } from './services/services_content';
import { TimeRange } from './services/types';
import { parseTimeRange } from './utils/time_utils';
import { DEFAULT_PROMETHEUS_CONNECTION_ID } from '../../../common/constants/apm_config';

export interface ApmServicesProps {
  chrome: any;
  parentBreadcrumb: ChromeBreadcrumb;
  http: HttpSetup;
  embeddable: any;
  dataSourceId?: string;
  prometheusConnectionId?: string;
  [key: string]: any;
}

/**
 * APM Services page with time range picker and services list
 * Tests Task 2 APIs: PPL queries (listServices) and PromQL metrics (executeMetricRequest)
 */
export const Services = (props: ApmServicesProps) => {
  const {
    chrome,
    parentBreadcrumb,
    http,
    embeddable,
    dataSourceId = 'default',
    prometheusConnectionId = DEFAULT_PROMETHEUS_CONNECTION_ID,
  } = props;

  // Time range state (default: last 15 minutes)
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });

  // Parse time range for API calls
  const parsedTimeRange = useMemo(() => {
    return parseTimeRange(timeRange);
  }, [timeRange]);

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

  // Handle time range changes
  const onTimeChange = ({ start, end }: OnTimeChangeProps) => {
    setTimeRange({ from: start, to: end });
  };

  return (
    <EuiPage>
      <EuiPageBody>
        {/* Services Content: Filter, Table, and TOP-K Widget */}
        <ServicesContent
          http={http}
          embeddable={embeddable}
          timeRange={parsedTimeRange}
          dataSourceId={dataSourceId}
          prometheusConnectionId={prometheusConnectionId}
          timeRangeState={timeRange}
          onTimeChange={onTimeChange}
        />
      </EuiPageBody>
    </EuiPage>
  );
};
