/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skeleton } from '@virajsanghvi/oui';
import { OUI2Wrapper } from './oui2_wrapper';

interface ServicesTableSkeletonProps {
  rows?: number;
}

/**
 * Loading skeleton for the services table
 * Uses OUI 2.0 Skeleton component with Tailwind utilities (oui: prefix)
 * Matches actual table structure: 3 columns (Service 40%, Environment 40%, Actions 10%)
 */
export const ServicesTableSkeleton: React.FC<ServicesTableSkeletonProps> = ({ rows = 10 }) => {
  return (
    <OUI2Wrapper>
      <div className="oui:w-full">
        {/* Table header skeleton */}
        <div className="oui:flex oui:items-center oui:gap-4 oui:p-4 oui:border-b oui:border-gray-300 oui:bg-gray-50">
          <div className="oui:w-2/5">
            <Skeleton className="oui:h-4 oui:w-32" /> {/* "Service Name" header */}
          </div>
          <div className="oui:w-2/5">
            <Skeleton className="oui:h-4 oui:w-24" /> {/* "Environment" header */}
          </div>
          <div className="oui:w-1/5">
            <Skeleton className="oui:h-4 oui:w-20" /> {/* "Actions" header */}
          </div>
        </div>

        {/* Table rows skeleton */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="oui:flex oui:items-center oui:gap-4 oui:p-4 oui:border-b oui:border-gray-200 oui:hover:bg-gray-50"
          >
            {/* Service Name column - 40% */}
            <div className="oui:w-2/5">
              <Skeleton className="oui:h-4 oui:w-4/5" /> {/* Link text */}
            </div>

            {/* Environment column - 40% */}
            <div className="oui:w-2/5">
              <Skeleton className="oui:h-6 oui:w-24 oui:rounded-full" /> {/* Badge */}
            </div>

            {/* Actions column - 10% */}
            <div className="oui:w-1/5">
              <Skeleton className="oui:h-8 oui:w-8 oui:rounded" /> {/* Action button */}
            </div>
          </div>
        ))}

        {/* Pagination skeleton */}
        <div className="oui:flex oui:justify-between oui:items-center oui:p-4 oui:border-t oui:border-gray-300">
          <Skeleton className="oui:h-4 oui:w-40" /> {/* "Rows per page" text */}
          <div className="oui:flex oui:gap-2">
            <Skeleton className="oui:h-8 oui:w-8 oui:rounded" /> {/* Prev button */}
            <Skeleton className="oui:h-8 oui:w-8 oui:rounded" /> {/* Page 1 */}
            <Skeleton className="oui:h-8 oui:w-8 oui:rounded" /> {/* Page 2 */}
            <Skeleton className="oui:h-8 oui:w-8 oui:rounded" /> {/* Next button */}
          </div>
        </div>
      </div>
    </OUI2Wrapper>
  );
};
