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

// Color indicator helper for threshold filters
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

// Colored label component for threshold checkboxes
// Display format: [] 🔴 < 95% (checkbox, colored circle, then text)
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

export interface DependencyFilterSidebarProps {
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

  // Dependency name filter
  dependencyNames: string[];
  selectedDependencies: string[];
  onDependencyChange: (selected: string[]) => void;

  // Service operation filter
  serviceOperations: string[];
  selectedServiceOperations: string[];
  onServiceOperationChange: (selected: string[]) => void;

  // Remote operation filter
  remoteOperations: string[];
  selectedRemoteOperations: string[];
  onRemoteOperationChange: (selected: string[]) => void;

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
 * DependencyFilterSidebar - Multi-section filter sidebar for dependencies page
 *
 * Provides a collapsible left sidebar with five filter sections:
 * - Availability threshold (checkboxes)
 * - Error rate threshold (checkboxes)
 * - Fault rate threshold (checkboxes)
 * - Dependency name (search + checkboxes)
 * - Operation (search + checkboxes)
 *
 * Uses SLO-based threshold filters with OR logic
 */
export const DependencyFilterSidebar: React.FC<DependencyFilterSidebarProps> = ({
  availabilityThresholds,
  selectedAvailabilityThresholds,
  onAvailabilityThresholdsChange,
  errorRateThresholds,
  selectedErrorRateThresholds,
  onErrorRateThresholdsChange,
  faultRateThresholds,
  selectedFaultRateThresholds,
  onFaultRateThresholdsChange,
  dependencyNames,
  selectedDependencies,
  onDependencyChange,
  serviceOperations,
  selectedServiceOperations,
  onServiceOperationChange,
  remoteOperations,
  selectedRemoteOperations,
  onRemoteOperationChange,
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
  const [dependencySearch, setDependencySearch] = useState('');
  const [serviceOperationSearch, setServiceOperationSearch] = useState('');
  const [remoteOperationSearch, setRemoteOperationSearch] = useState('');
  const [showAllDependencies, setShowAllDependencies] = useState(false);
  const [showAllServiceOperations, setShowAllServiceOperations] = useState(false);
  const [showAllRemoteOperations, setShowAllRemoteOperations] = useState(false);

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

  // Dependency name section
  const filteredDependencies = useMemo(() => {
    if (!dependencySearch) return dependencyNames;
    const searchLower = dependencySearch.toLowerCase();
    return dependencyNames.filter((name) => name.toLowerCase().includes(searchLower));
  }, [dependencyNames, dependencySearch]);

  const visibleDependencies = useMemo(() => {
    if (showAllDependencies || filteredDependencies.length <= initialItemCount) {
      return filteredDependencies;
    }
    return filteredDependencies.slice(0, initialItemCount);
  }, [filteredDependencies, showAllDependencies]);

  const dependencyCheckboxOptions = useMemo(() => {
    return visibleDependencies.map((dep) => ({
      id: dep,
      label: dep,
    }));
  }, [visibleDependencies]);

  const dependencySelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedDependencies.forEach((dep) => {
      map[dep] = true;
    });
    return map;
  }, [selectedDependencies]);

  const handleDependencyChange = useCallback(
    (optionId: string) => {
      const isSelected = selectedDependencies.includes(optionId);
      if (isSelected) {
        onDependencyChange(selectedDependencies.filter((d) => d !== optionId));
      } else {
        onDependencyChange([...selectedDependencies, optionId]);
      }
    },
    [selectedDependencies, onDependencyChange]
  );

  // Service operation section
  const filteredServiceOperations = useMemo(() => {
    if (!serviceOperationSearch) return serviceOperations;
    const searchLower = serviceOperationSearch.toLowerCase();
    return serviceOperations.filter((op) => op.toLowerCase().includes(searchLower));
  }, [serviceOperations, serviceOperationSearch]);

  const visibleServiceOperations = useMemo(() => {
    if (showAllServiceOperations || filteredServiceOperations.length <= initialItemCount) {
      return filteredServiceOperations;
    }
    return filteredServiceOperations.slice(0, initialItemCount);
  }, [filteredServiceOperations, showAllServiceOperations]);

  // Remote operation section
  const filteredRemoteOperations = useMemo(() => {
    if (!remoteOperationSearch) return remoteOperations;
    const searchLower = remoteOperationSearch.toLowerCase();
    return remoteOperations.filter((op) => op.toLowerCase().includes(searchLower));
  }, [remoteOperations, remoteOperationSearch]);

  const visibleRemoteOperations = useMemo(() => {
    if (showAllRemoteOperations || filteredRemoteOperations.length <= initialItemCount) {
      return filteredRemoteOperations;
    }
    return filteredRemoteOperations.slice(0, initialItemCount);
  }, [filteredRemoteOperations, showAllRemoteOperations]);

  // Service operation checkbox options
  const serviceOperationCheckboxOptions = useMemo(() => {
    return visibleServiceOperations.map((op) => ({
      id: op,
      label: op,
    }));
  }, [visibleServiceOperations]);

  const serviceOperationSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedServiceOperations.forEach((op) => {
      map[op] = true;
    });
    return map;
  }, [selectedServiceOperations]);

  const handleServiceOperationChange = useCallback(
    (optionId: string) => {
      const isSelected = selectedServiceOperations.includes(optionId);
      if (isSelected) {
        onServiceOperationChange(selectedServiceOperations.filter((o) => o !== optionId));
      } else {
        onServiceOperationChange([...selectedServiceOperations, optionId]);
      }
    },
    [selectedServiceOperations, onServiceOperationChange]
  );

  // Remote operation checkbox options
  const remoteOperationCheckboxOptions = useMemo(() => {
    return visibleRemoteOperations.map((op) => ({
      id: op,
      label: op,
    }));
  }, [visibleRemoteOperations]);

  const remoteOperationSelectionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    selectedRemoteOperations.forEach((op) => {
      map[op] = true;
    });
    return map;
  }, [selectedRemoteOperations]);

  const handleRemoteOperationChange = useCallback(
    (optionId: string) => {
      const isSelected = selectedRemoteOperations.includes(optionId);
      if (isSelected) {
        onRemoteOperationChange(selectedRemoteOperations.filter((o) => o !== optionId));
      } else {
        onRemoteOperationChange([...selectedRemoteOperations, optionId]);
      }
    },
    [selectedRemoteOperations, onRemoteOperationChange]
  );

  // Helper functions for select/clear all
  const handleSelectAllDependencies = useCallback(() => {
    onDependencyChange(filteredDependencies);
  }, [filteredDependencies, onDependencyChange]);

  const handleClearAllDependencies = useCallback(() => {
    onDependencyChange([]);
  }, [onDependencyChange]);

  const handleSelectAllServiceOperations = useCallback(() => {
    onServiceOperationChange(filteredServiceOperations);
  }, [filteredServiceOperations, onServiceOperationChange]);

  const handleClearAllServiceOperations = useCallback(() => {
    onServiceOperationChange([]);
  }, [onServiceOperationChange]);

  const handleSelectAllRemoteOperations = useCallback(() => {
    onRemoteOperationChange(filteredRemoteOperations);
  }, [filteredRemoteOperations, onRemoteOperationChange]);

  const handleClearAllRemoteOperations = useCallback(() => {
    onRemoteOperationChange([]);
  }, [onRemoteOperationChange]);

  if (!isOpen) {
    // Collapsed state - show toggle button only
    return (
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder style={{ width: 40 }}>
        <EuiButtonIcon
          iconType="menuRight"
          onClick={onToggle}
          aria-label="Open filters"
          data-test-subj="dependencyFilterSidebarToggleOpen"
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
            data-test-subj="dependencyFilterSidebarToggleClose"
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

      {/* Section 2: Dependency Name */}
      <EuiAccordion
        id="dependencyNameAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Dependency name</strong>
          </EuiText>
        }
        initialIsOpen={true}
        data-test-subj="dependencyNameAccordion"
      >
        <EuiSpacer size="s" />

        {/* Search box */}
        <EuiFieldSearch
          placeholder="Search dependencies"
          value={dependencySearch}
          onChange={(e) => setDependencySearch(e.target.value)}
          isClearable
          fullWidth
          compressed
          data-test-subj="dependencyNameSearch"
        />

        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {filteredDependencies.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllDependencies}
                  data-test-subj="dependencySelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllDependencies}
                  data-test-subj="dependencyClearAll"
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
        {dependencyCheckboxOptions.length > 0 ? (
          <>
            <EuiCheckboxGroup
              options={dependencyCheckboxOptions}
              idToSelectedMap={dependencySelectionMap}
              onChange={handleDependencyChange}
              compressed
              data-test-subj="dependencyNameCheckboxGroup"
            />

            {/* View more/less link */}
            {filteredDependencies.length > initialItemCount && (
              <>
                <EuiSpacer size="s" />
                <EuiLink
                  onClick={() => setShowAllDependencies(!showAllDependencies)}
                  data-test-subj="dependencyViewMore"
                  color="primary"
                >
                  <EuiText size="xs">{showAllDependencies ? 'View less' : 'View more'}</EuiText>
                </EuiLink>
              </>
            )}
          </>
        ) : (
          <EuiText size="s" color="subdued">
            No dependencies found
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

      <EuiSpacer size="m" />

      {/* Section 7: Service operations */}
      <EuiAccordion
        id="serviceOperationAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Service operations</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="serviceOperationAccordion"
      >
        <EuiSpacer size="s" />

        {/* Search box */}
        <EuiFieldSearch
          placeholder="Search service operations"
          value={serviceOperationSearch}
          onChange={(e) => setServiceOperationSearch(e.target.value)}
          isClearable
          fullWidth
          compressed
          data-test-subj="serviceOperationSearch"
        />

        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {filteredServiceOperations.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllServiceOperations}
                  data-test-subj="serviceOperationSelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllServiceOperations}
                  data-test-subj="serviceOperationClearAll"
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
        {serviceOperationCheckboxOptions.length > 0 ? (
          <>
            <EuiCheckboxGroup
              options={serviceOperationCheckboxOptions}
              idToSelectedMap={serviceOperationSelectionMap}
              onChange={handleServiceOperationChange}
              compressed
              data-test-subj="serviceOperationCheckboxGroup"
            />

            {/* View more/less link */}
            {filteredServiceOperations.length > initialItemCount && (
              <>
                <EuiSpacer size="s" />
                <EuiLink
                  onClick={() => setShowAllServiceOperations(!showAllServiceOperations)}
                  data-test-subj="serviceOperationViewMore"
                  color="primary"
                >
                  <EuiText size="xs">
                    {showAllServiceOperations ? 'View less' : 'View more'}
                  </EuiText>
                </EuiLink>
              </>
            )}
          </>
        ) : (
          <EuiText size="s" color="subdued">
            No service operations found
          </EuiText>
        )}
      </EuiAccordion>

      <EuiSpacer size="m" />

      {/* Section 8: Remote operations */}
      <EuiAccordion
        id="remoteOperationAccordion"
        buttonContent={
          <EuiText size="s">
            <strong>Remote operations</strong>
          </EuiText>
        }
        initialIsOpen={false}
        data-test-subj="remoteOperationAccordion"
      >
        <EuiSpacer size="s" />

        {/* Search box */}
        <EuiFieldSearch
          placeholder="Search remote operations"
          value={remoteOperationSearch}
          onChange={(e) => setRemoteOperationSearch(e.target.value)}
          isClearable
          fullWidth
          compressed
          data-test-subj="remoteOperationSearch"
        />

        <EuiSpacer size="s" />

        {/* Select all / Clear all links */}
        {filteredRemoteOperations.length > 0 && (
          <>
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleSelectAllRemoteOperations}
                  data-test-subj="remoteOperationSelectAll"
                  color="primary"
                >
                  <EuiText size="xs">Select all</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={handleClearAllRemoteOperations}
                  data-test-subj="remoteOperationClearAll"
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
        {remoteOperationCheckboxOptions.length > 0 ? (
          <>
            <EuiCheckboxGroup
              options={remoteOperationCheckboxOptions}
              idToSelectedMap={remoteOperationSelectionMap}
              onChange={handleRemoteOperationChange}
              compressed
              data-test-subj="remoteOperationCheckboxGroup"
            />

            {/* View more/less link */}
            {filteredRemoteOperations.length > initialItemCount && (
              <>
                <EuiSpacer size="s" />
                <EuiLink
                  onClick={() => setShowAllRemoteOperations(!showAllRemoteOperations)}
                  data-test-subj="remoteOperationViewMore"
                  color="primary"
                >
                  <EuiText size="xs">{showAllRemoteOperations ? 'View less' : 'View more'}</EuiText>
                </EuiLink>
              </>
            )}
          </>
        ) : (
          <EuiText size="s" color="subdued">
            No remote operations found
          </EuiText>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
