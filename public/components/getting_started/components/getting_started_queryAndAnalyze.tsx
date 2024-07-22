/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { coreRefs } from '../../../../public/framework/core_refs';

interface QueryAndAnalyzeProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  selectedTechnology: string;
}

const technologyPaths: Record<string, string> = {
  // CHANGE TO GET THE CREATED TAG
  OTEL: 'view/c39012d0-eb7a-11ed-8e00-17d7d50cd7b2',
  CSV: 'view/c39012d0-eb7a-11ed-8e00-17d7d50cd7b2',
  Golang: 'view/c39012d0-eb7a-11ed-8e00-17d7d50cd7b2',
  Python: 'view/c39012d0-eb7a-11ed-8e00-17d7d50cd7b2',
};

export const QueryAndAnalyze: React.FC<QueryAndAnalyzeProps> = ({
  isOpen,
  onToggle,
  selectedTechnology,
}) => {
  const [searchValue, setSearchValue] = useState<string>('');

  const redirectToDashboards = (path: string) => {
    coreRefs?.application!.navigateToApp('dashboards', {
      path: `#/${path}`,
    });
  };

  const redirectToDiscover = (indexPatternId: string) => {
    coreRefs?.application!.navigateToApp('data-explorer', {
      path: `discover#?_a=(discover:(columns:!(_source),isDirty:!f,sort:!()),metadata:(indexPattern:'${indexPatternId}',view:discover))&_q=(filters:!(),query:(language:kuery,query:''))&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))`,
    });
  };

  // Remove view
  const currentPath = technologyPaths[selectedTechnology];

  return (
    <EuiAccordion
      id="query-and-analyze"
      buttonContent={`Query & Analyze Data: ${selectedTechnology}`}
      paddingSize="m"
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={onToggle}
    >
      <EuiPanel>
        <EuiTitle size="m">
          <h2>Query Data</h2>
        </EuiTitle>
        <EuiText>
          <p>
            <strong>Explore your data</strong>
          </p>
        </EuiText>
        <EuiFieldSearch
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          isClearable
          aria-label="Use aria labels when no actual label is in use"
        />
        <EuiSpacer size="l" />
        <EuiHorizontalRule />
        <EuiTitle size="m">
          <h2>Analyze Data</h2>
        </EuiTitle>
        <EuiText>
          <p>
            <strong>Visualize your data</strong>
          </p>
        </EuiText>
        <EuiText>
          <p>
            Visualize your data with these recommended out-of-the-box dashboards for your data, or
            create a new dashboard from scratch.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup wrap>
          <EuiFlexItem style={{ maxWidth: '300px' }}>
            <EuiCard
              icon={<div />}
              title={selectedTechnology}
              description={`Explore the ${selectedTechnology} dashboard`}
              onClick={() => {
                // redirectToDashboards(currentPath);
                redirectToDiscover('71d16e20-1ded-11ef-a919-b1b4f3002b90');
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ maxWidth: '300px' }}>
            <EuiCard
              icon={<div />}
              title="Create New Dashboard"
              description="Create a new dashboard to visualize your data"
              onClick={() => {
                redirectToDashboards('dashboards');
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
