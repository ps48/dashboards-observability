/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { ServiceTableItem } from '../../services/types';
import { filterServices } from '../../utils/service_utils';

interface PropertyFilterProps {
  items: ServiceTableItem[];
  onFilteredItems: (filteredItems: ServiceTableItem[]) => void;
}

/**
 * Simple text-based property filter for service name and environment
 * (Simplified version - not the full CloudWatch-style filter)
 */
export const PropertyFilter: React.FC<PropertyFilterProps> = ({ items, onFilteredItems }) => {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    return filterServices(items, query);
  }, [items, query]);

  useEffect(() => {
    onFilteredItems(filteredItems);
  }, [filteredItems, onFilteredItems]);

  return (
    <EuiFieldSearch
      placeholder="Filter services by name or environment..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      isClearable
      fullWidth
      aria-label="Filter services"
    />
  );
};
