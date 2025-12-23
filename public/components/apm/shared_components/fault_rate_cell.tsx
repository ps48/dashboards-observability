/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React from 'react';

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
    <EuiFlexGroup gutterSize="s" alignItems="center" style={{ maxWidth: '100%' }}>
      <EuiFlexItem>
        <EuiProgress
          valueText={formatPercentage(faultRate)}
          value={relativePercentage}
          max={100}
          size="m"
          color="vis2"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
