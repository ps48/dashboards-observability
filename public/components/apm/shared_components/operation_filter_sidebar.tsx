/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiAccordion,
  EuiFieldSearch,
  EuiSpacer,
  EuiCheckboxGroup,
  EuiLink,
  EuiHorizontalRule,
  EuiDualRange,
} from '@elastic/eui';

// Color indicator helper for threshold filters (reused from DependencyFilterSidebar)
const getThresholdColor = (
  threshold: string,
  type: 'availability' | 'errorRate' | 'faultRate'
): string => {
  if (type === 'availability') {
    if (threshold === '< 95%') return '#BD271E'; // danger
    if (threshold === '95-99%') return '#F5A700'; // warning
    if (threshold === '≥ 99%') return '#017D73'; // success
  } else {
    // For error and fault rates, low is good
    if (threshold === '> 5%') return '#BD271E'; // danger
    if (threshold === '1-5%') return '#F5A700'; // warning
    if (threshold === '< 1%') return '#017D73'; // success
  }
  return '#69707D'; // default subdued gray
};

// Colored label component for threshold checkboxes (reused from DependencyFilterSidebar)
const ColoredThresholdLabel: React.FC<{ threshold: string; color: string }> = ({
  threshold,
  color,
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          border: '1px solid rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{threshold}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface OperationFilterSidebarProps {
  // Availability threshold filter
  availabilityThresholds: string[];
  selectedAvailabilityThresholds: string[];
  onAvailabilityThresholdsChange: (selected: string[]) => void;

  // Error rate threshold filter
  errorRateThresholds: string[];
  selectedErrorRateThresholds: string[];
  onErrorRateThresholdsChange: (selected: string[]) => void;

  // Fault rate threshold filter
  faultRateThresholds: string[];
  selectedFaultRateThresholds: string[];
  onFaultRateThresholdsChange: (selected: string[]) => void;

  // Operation name filter
  operationNames: string[];
  selectedOperations: string[];
  onOperationChange: (selected: string[]) => void;

  // Latency range filter
  latencyRange: [number, number];
  onLatencyRangeChange: (range: [number, number]) => void;
  latencyMin: number;
  latencyMax: number;

  // Requests range filter
  requestsRange: [number, number];
  onRequestsRangeChange: (range: [number, number]) => void;
  requestsMin: number;
  requestsMax: number;

  // Sidebar state
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * OperationFilterSidebar - Multi-section filter sidebar for operations page
 *
 * Provides a collapsible left sidebar with filter sections:
 * - Availability threshold (checkboxes with color indicators)
 * - Error rate threshold (checkboxes with color indicators)
 * - Fault rate threshold (checkboxes with color indicators)
 * - Operation name (search + checkboxes)
 * - Latency (p99) range slider
 * - Requests range slider
 *
 * Adapted from DependencyFilterSidebar but without service/remote operations
 */
export const OperationFilterSidebar: React.FC<OperationFilterSidebarProps> = ({
  availabilityThresholds,
  selectedAvailabilityThresholds,
  onAvailabilityThresholdsChange,
  errorRateThresholds,
  selectedErrorRateThresholds,
  onErrorRateThresholdsChange,
  faultRateThresholds,
  selectedFaultRateThresholds,
  onFaultRateThresholdsChange,
  operationNames,
  selectedOperations,
  onOperationChange,
  latencyRange,
  onLatencyRangeChange,
  latencyMin,
  latencyMax,
  requestsRange,
  onRequestsRangeChange,
  requestsMin,
  requestsMax,
  isOpen,
  onToggle,
}) => {
  const [operationSearch, setOperationSearch] = useState('');
  const [showAllOperations, setShowAllOperations] = useState(false);

  const initialItemCount = 10;

  // Availability threshold section
  const availabilityThresholdOptions = useMemo(() => {
    return availabilityThresholds.map((threshold) => ({
      id: `availability-${threshold}`,
      label: (
        <ColoredThresholdLabel
          threshold={threshold}
          color={getThresholdColor(threshold, 'availability')}
        />
      ),
    }));
  }, [availabilityThresholds]);

  const availabilityThresholdSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedAvailabilityThresholds.forEach((threshold) => {
      map[`availability-${threshold}`] = true;
    });
    return map;
  }, [selectedAvailabilityThresholds]);

  const handleAvailabilityThresholdChange = useCallback(
    (optionId: string) => {
      const threshold = optionId.replace('availability-', '');
      const isSelected = selectedAvailabilityThresholds.includes(threshold);
      if (isSelected) {
        onAvailabilityThresholdsChange(
          selectedAvailabilityThresholds.filter((t) => t !== threshold)
        );
      } else {
        onAvailabilityThresholdsChange([...selectedAvailabilityThresholds, threshold]);
      }
    },
    [selectedAvailabilityThresholds, onAvailabilityThresholdsChange]
  );

  // Error rate threshold section
  const errorRateThresholdOptions = useMemo(() => {
    return errorRateThresholds.map((threshold) => ({
      id: `error-rate-${threshold}`,
      label: (
        <ColoredThresholdLabel
          threshold={threshold}
          color={getThresholdColor(threshold, 'errorRate')}
        />
      ),
    }));
  }, [errorRateThresholds]);

  const errorRateThresholdSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedErrorRateThresholds.forEach((threshold) => {
      map[`error-rate-${threshold}`] = true;
    });
    return map;
  }, [selectedErrorRateThresholds]);

  const handleErrorRateThresholdChange = useCallback(
    (optionId: string) => {
      const threshold = optionId.replace('error-rate-', '');
      const isSelected = selectedErrorRateThresholds.includes(threshold);
      if (isSelected) {
        onErrorRateThresholdsChange(selectedErrorRateThresholds.filter((t) => t !== threshold));
      } else {
        onErrorRateThresholdsChange([...selectedErrorRateThresholds, threshold]);
      }
    },
    [selectedErrorRateThresholds, onErrorRateThresholdsChange]
  );

  // Fault rate threshold section
  const faultRateThresholdOptions = useMemo(() => {
    return faultRateThresholds.map((threshold) => ({
      id: `fault-rate-${threshold}`,
      label: (
        <ColoredThresholdLabel
          threshold={threshold}
          color={getThresholdColor(threshold, 'faultRate')}
        />
      ),
    }));
  }, [faultRateThresholds]);

  const faultRateThresholdSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedFaultRateThresholds.forEach((threshold) => {
      map[`fault-rate-${threshold}`] = true;
    });
    return map;
  }, [selectedFaultRateThresholds]);

  const handleFaultRateThresholdChange = useCallback(
    (optionId: string) => {
      const threshold = optionId.replace('fault-rate-', '');
      const isSelected = selectedFaultRateThresholds.includes(threshold);
      if (isSelected) {
        onFaultRateThresholdsChange(selectedFaultRateThresholds.filter((t) => t !== threshold));
      } else {
        onFaultRateThresholdsChange([...selectedFaultRateThresholds, threshold]);
      }
    },
    [selectedFaultRateThresholds, onFaultRateThresholdsChange]
  );

  // Select/Clear all for availability thresholds
  const handleSelectAllAvailability = useCallback(() => {
    onAvailabilityThresholdsChange(availabilityThresholds);
  }, [availabilityThresholds, onAvailabilityThresholdsChange]);

  const handleClearAllAvailability = useCallback(() => {
    onAvailabilityThresholdsChange([]);
  }, [onAvailabilityThresholdsChange]);

  // Select/Clear all for error rate thresholds
  const handleSelectAllErrorRate = useCallback(() => {
    onErrorRateThresholdsChange(errorRateThresholds);
  }, [errorRateThresholds, onErrorRateThresholdsChange]);

  const handleClearAllErrorRate = useCallback(() => {
    onErrorRateThresholdsChange([]);
  }, [onErrorRateThresholdsChange]);

  // Select/Clear all for fault rate thresholds
  const handleSelectAllFaultRate = useCallback(() => {
    onFaultRateThresholdsChange(faultRateThresholds);
  }, [faultRateThresholds, onFaultRateThresholdsChange]);

  const handleClearAllFaultRate = useCallback(() => {
    onFaultRateThresholdsChange([]);
  }, [onFaultRateThresholdsChange]);

  // Operation name section
  const filteredOperations = useMemo(() => {
    if (!operationSearch) return operationNames;
    const searchLower = operationSearch.toLowerCase();
    return operationNames.filter((name) => name.toLowerCase().includes(searchLower));
  }, [operationNames, operationSearch]);

  const visibleOperations = useMemo(() => {
    if (showAllOperations || filteredOperations.length <= initialItemCount) {
      return filteredOperations;
    }
    return filteredOperations.slice(0, initialItemCount);
  }, [filteredOperations, showAllOperations]);

  const operationCheckboxOptions = useMemo(() => {
    return visibleOperations.map((op) => ({
      id: op,
      label: op,
    }));
  }, [visibleOperations]);

  const operationSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedOperations.forEach((op) => {
      map[op] = true;
    });
    return map;
  }, [selectedOperations]);

  const handleOperationChange = useCallback(
    (optionId: string) => {
      const isSelected = selectedOperations.includes(optionId);
      if (isSelected) {
        onOperationChange(selectedOperations.filter((o) => o !== optionId));
      } else {
        onOperationChange([...selectedOperations, optionId]);
      }
    },
    [selectedOperations, onOperationChange]
  );

  // Helper functions for select/clear all
  const handleSelectAllOperations = useCallback(() => {
    onOperationChange(filteredOperations);
  }, [filteredOperations, onOperationChange]);

  const handleClearAllOperations = useCallback(() => {
    onOperationChange([]);
  }, [onOperationChange]);

  if (!isOpen) {
    // Collapsed state - show toggle button only
    return (
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder style={{ width: 40 }}>
        <EuiButtonIcon
          iconType="menuRight"
          onClick={onToggle}
          aria-label="Open filters"
          data-test-subj="operationFilterSidebarToggleOpen"
        />
      </EuiPanel>
    );
  }

  // Expanded state - show full sidebar with multiple sections
  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder style={{ width: 280 }}>
      {/* Header with close button */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>Filters</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="menuLeft"
            onClick={onToggle}
            aria-label="Close filters"
            data-test-subj="operationFilterSidebarToggleClose"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="m" />

      {/* Section 1: Availability Threshold */}
      <EuiAccordion
        id="availabilityThresholdAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Availability</strong>
          </EuiText>
        }
        initialIsOpen={true}
        data-test-subj="availabilityThresholdAccordion"
      >
        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {availabilityThresholdOptions.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllAvailability}
                  data-test-subj="availabilitySelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllAvailability}
                  data-test-subj="availabilityClearAll"
                  color="primary"
                >
                  <EuiText size="xs">Clear all</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {availabilityThresholdOptions.length > 0 ? (
          <EuiCheckboxGroup
            options={availabilityThresholdOptions}
            idToSelectedMap={availabilityThresholdSelectionMap}
            onChange={handleAvailabilityThresholdChange}
            compressed
            data-test-subj="availabilityThresholdCheckboxGroup"
          />
        ) : (
          <EuiText size="s" color="subdued">
            No availability thresholds
          </EuiText>
        )}
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 2: Operation Name */}
      <EuiAccordion
        id="operationNameAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Operations</strong>
          </EuiText>
        }
        initialIsOpen={true}
        data-test-subj="operationNameAccordion"
      >
        <EuiSpacer size="s" />

        {/* Search box */}
        <EuiFieldSearch
          placeholder="Search operations"
          value={operationSearch}
          onChange={(e) => setOperationSearch(e.target.value)}
          isClearable
          fullWidth
          compressed
          data-test-subj="operationNameSearch"
        />

        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {filteredOperations.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllOperations}
                  data-test-subj="operationSelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllOperations}
                  data-test-subj="operationClearAll"
                  color="primary"
                >
                  <EuiText size="xs">Clear all</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {/* Checkbox list */}
        {operationCheckboxOptions.length > 0 ? (
          <>
            <EuiCheckboxGroup
              options={operationCheckboxOptions}
              idToSelectedMap={operationSelectionMap}
              onChange={handleOperationChange}
              compressed
              data-test-subj="operationNameCheckboxGroup"
            />

            {/* View more/less link */}
            {filteredOperations.length > initialItemCount && (
              <>
                <EuiSpacer size="s" />
                <EuiLink
                  onClick={() => setShowAllOperations(!showAllOperations)}
                  data-test-subj="operationViewMore"
                  color="primary"
                >
                  <EuiText size="xs">{showAllOperations ? 'View less' : 'View more'}</EuiText>
                </EuiLink>
              </>
            )}
          </>
        ) : (
          <EuiText size="s" color="subdued">
            No operations found
          </EuiText>
        )}
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 3: Error Rate Threshold */}
      <EuiAccordion
        id="errorRateThresholdAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Error Rate</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="errorRateThresholdAccordion"
      >
        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {errorRateThresholdOptions.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllErrorRate}
                  data-test-subj="errorRateSelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllErrorRate}
                  data-test-subj="errorRateClearAll"
                  color="primary"
                >
                  <EuiText size="xs">Clear all</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {errorRateThresholdOptions.length > 0 ? (
          <EuiCheckboxGroup
            options={errorRateThresholdOptions}
            idToSelectedMap={errorRateThresholdSelectionMap}
            onChange={handleErrorRateThresholdChange}
            compressed
            data-test-subj="errorRateThresholdCheckboxGroup"
          />
        ) : (
          <EuiText size="s" color="subdued">
            No error rate thresholds
          </EuiText>
        )}
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 4: Fault Rate Threshold */}
      <EuiAccordion
        id="faultRateThresholdAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Fault Rate</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="faultRateThresholdAccordion"
      >
        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {faultRateThresholdOptions.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllFaultRate}
                  data-test-subj="faultRateSelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllFaultRate}
                  data-test-subj="faultRateClearAll"
                  color="primary"
                >
                  <EuiText size="xs">Clear all</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}

        {faultRateThresholdOptions.length > 0 ? (
          <EuiCheckboxGroup
            options={faultRateThresholdOptions}
            idToSelectedMap={faultRateThresholdSelectionMap}
            onChange={handleFaultRateThresholdChange}
            compressed
            data-test-subj="faultRateThresholdCheckboxGroup"
          />
        ) : (
          <EuiText size="s" color="subdued">
            No fault rate thresholds
          </EuiText>
        )}
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 5: Latency Filter */}
      <EuiAccordion
        id="latencyAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Latency (p99)</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="latencyAccordion"
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          Filter by p99 latency (ms)
        </EuiText>
        <EuiSpacer size="s" />
        <EuiDualRange
          min={latencyMin}
          max={latencyMax}
          value={latencyRange}
          onChange={(value) => onLatencyRangeChange(value as [number, number])}
          showLabels
          showValue
          compressed
          data-test-subj="latencyRangeSlider"
        />
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 6: Requests Filter */}
      <EuiAccordion
        id="requestsAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Requests</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="requestsAccordion"
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          Filter by request count
        </EuiText>
        <EuiSpacer size="s" />
        <EuiDualRange
          min={requestsMin}
          max={requestsMax}
          value={requestsRange}
          onChange={(value) => onRequestsRangeChange(value as [number, number])}
          showLabels
          showValue
          compressed
          data-test-subj="requestsRangeSlider"
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
