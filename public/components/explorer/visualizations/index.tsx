/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './app.scss';

import _ from 'lodash';

import React, { useState } from 'react';
import { FrameLayout } from './frame_layout';
import { DataPanel } from './datapanel';
import { Sidebar } from '../sidebar/sidebar';
import { WorkspacePanel } from './workspace_panel';
import { ConfigPanelWrapper } from './config_panel';

export const ExplorerVisualizations = ({
  curVisId,
  setCurVisId,
  explorerVis,
  explorerFields,
  explorerData,
  handleAddField,
  handleRemoveField,
  savedObjects,
  onSaveVisualization,
  getSavedVisualization,
}: any) => {
  const [currentVizConfigs, setCurrentVizConfigs] = useState(() => {
    return {};
  });

  return (
    <FrameLayout
      dataPanel={
        <Sidebar
          explorerFields={explorerFields}
          explorerData={explorerData}
          handleAddField={handleAddField}
          handleRemoveField={handleRemoveField}
        />
      }
      workspacePanel={
        <WorkspacePanel
          curVisId={curVisId}
          setCurVisId={setCurVisId}
          visualizations={explorerVis}
          savedObjects={savedObjects}
          onSaveVisualization={onSaveVisualization}
          getSavedObjects={getSavedVisualization}
          currentVizConfigs={currentVizConfigs}
          setCurrentVizConfigs={setCurrentVizConfigs}
        />
      }
      configPanel={<ConfigPanelWrapper explorerFields={explorerFields} />}
    />
  );
};
