/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skeleton } from '@virajsanghvi/oui';
import { OUI2Wrapper } from './oui2_wrapper';

interface TopFaultRateWidgetSkeletonProps {
  rows?: number;
}

/**
 * Loading skeleton for top services/dependencies by fault rate widgets
 * Matches the structure of the actual widget with title and table
 */
export const TopFaultRateWidgetSkeleton: React.FC<TopFaultRateWidgetSkeletonProps> = ({
  rows = 5
}) => {
  return (
    <OUI2Wrapper>
      <div className="oui:border oui:border-gray-300 oui:rounded oui:bg-white oui:p-4">
        {/* Widget title skeleton */}
        <Skeleton className="oui:h-6 oui:w-64 oui:mb-4" />

        {/* Table rows */}
        <div className="oui:flex oui:flex-col oui:gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="oui:flex oui:items-center oui:gap-4">
              {/* Service info (40%) */}
              <div className="oui:w-2/5 oui:flex oui:flex-col oui:gap-1">
                <Skeleton className="oui:h-4 oui:w-full" /> {/* Service name */}
                <Skeleton className="oui:h-3 oui:w-20" /> {/* Environment badge */}
              </div>

              {/* Fault rate (60%) */}
              <div className="oui:w-3/5 oui:flex oui:items-center oui:gap-2">
                <Skeleton className="oui:h-3 oui:w-12" /> {/* Percentage text */}
                <Skeleton className="oui:h-2 oui:flex-1 oui:rounded-full" /> {/* Progress bar */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </OUI2Wrapper>
  );
};
