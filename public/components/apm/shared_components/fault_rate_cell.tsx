/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Progress } from '@virajsanghvi/oui';

export const getRelativePercentage = (fraction: number, fractionSum: number): number => {
  if (fractionSum <= 0) {
    return 0;
  }
  return (fraction / fractionSum) * 100;
};

/**
 * Format a percentage value for display
 * @param percentage - Already a percentage (0-100 from PromQL * 100)
 * @returns Formatted string like "10.50%"
 */
export const formatPercentage = (percentage: number): string => {
  return `${(+percentage).toFixed(2)}%`;
};

interface FaultRateCellProps {
  faultRate: number;
  relativePercentage: number;
}

export const FaultRateCell: React.FC<FaultRateCellProps> = ({
  faultRate,
  relativePercentage,
}: FaultRateCellProps) => {
  return (
    <div className="oui:space-y-1 oui:w-full">
      <div className="oui:text-xs oui:font-medium">
        {formatPercentage(faultRate)}
      </div>
      <Progress value={relativePercentage} className="oui:h-2 oui:w-full" />
    </div>
  );
};
