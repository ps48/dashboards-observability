/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButton,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { traceSchemaOptions } from '../../../../../../common/constants/trace_analytics';
import { TraceAnalyticsMode, TraceSource } from '../../../../../../common/types/trace_analytics';
import { OSDSavedTraceSourceClient } from '../../../../../services/saved_objects/saved_object_client/osd_saved_objects/saved_trace_sources';
import { ObservabilitySavedObject } from '../../../../../services/saved_objects/saved_object_client/types';
import { useToast } from '../../../../common/toast';
import { CustomSourceForm } from './custom_source_form';
import { ManageCustomSources } from './manage_custom_sources';

interface CustomSourceFlyoutProps {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  loadSources: () => void;
  customSources: ObservabilitySavedObject[];
}

export const CustomSourceFlyout = ({
  isFlyoutVisible,
  setIsFlyoutVisible,
  loadSources,
  customSources,
}: CustomSourceFlyoutProps) => {
  const { setToast } = useToast();

  const defaultFormState: TraceSource = {
    name: '',
    description: '',
    spanIndices: '',
    serviceIndices: '',
    type: traceSchemaOptions[0].value as TraceAnalyticsMode,
    isDefault: false,
  };
  const [formState, setFormState] = useState<TraceSource>(defaultFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption>>([]);

  const tabs = [
    {
      id: 'create-custom-source',
      name: 'Create trace source',
      content: <CustomSourceForm formState={formState} setFormState={setFormState} />,
    },
    {
      id: 'manage-custom-source',
      name: 'Manage trace sources',
      content: (
        <ManageCustomSources
          formState={formState}
          setFormState={setFormState}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          customSources={customSources}
        />
      ),
    },
  ];
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);

  const onCreateSource = async () => {
    try {
      setIsLoading(true);
      await OSDSavedTraceSourceClient.getInstance().create({
        ...formState,
      });
      setIsLoading(false);
      setToast('Created trace analytics source successfully', 'success');
    } catch (error) {
      console.error(error);
      setToast('Failed to create trace analytics source', 'danger');
    }
    setIsLoading(false);
  };

  const onUpdateSource = async () => {
    if (selectedOptions.length > 0) {
      try {
        setIsLoading(true);
        await OSDSavedTraceSourceClient.getInstance().update({
          objectId: selectedOptions[0].value,
          ...formState,
        });
        setIsLoading(false);
        setToast('Updated trace analytics source successfully', 'success');
      } catch (error) {
        console.error(error);
        setToast('Failed to update trace analytics source', 'danger');
      }
    } else {
      setToast('No trace analytics source selected', 'danger');
    }
    setIsLoading(false);
  };

  const onDeleteSource = async () => {
    if (selectedOptions.length > 0) {
      try {
        setIsLoading(true);
        // Need to test this, might not work when delete leads to a failure
        await OSDSavedTraceSourceClient.getInstance().delete({
          objectId: selectedOptions[0].value,
        });
        setIsLoading(false);
        setToast('D trace analytics source successfully', 'success');
      } catch (error) {
        console.error(error);
        setToast('Failed to update trace analytics source', 'danger');
      }
    } else {
      setToast('No trace analytics source selected', 'danger');
    }
    setIsLoading(false);
  };

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setIsFlyoutVisible(false)} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h3 id="flyoutTitle">Manage custom trace sources</h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            autoFocus="selected"
            onTabClick={(tab) => {
              setFormState(defaultFormState);
              setCurrentTabId(tab.id);
              setSelectedOptions([]);
            }}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => setIsFlyoutVisible(false)}>Close</EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {currentTabId === 'create-custom-source' ? (
                <EuiButton
                  onClick={async () => {
                    await onCreateSource();
                    setIsFlyoutVisible(false);
                  }}
                  fill
                  isLoading={isLoading}
                >
                  Create
                </EuiButton>
              ) : (
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="danger"
                      isLoading={isLoading}
                      onClick={async () => {
                        await onDeleteSource();
                        setSelectedOptions([]);
                      }}
                    >
                      Delete
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      isLoading={isLoading}
                      onClick={async () => {
                        await onUpdateSource();
                        // fetch the latest sources
                        // can avoid this by updating local states
                        loadSources();
                      }}
                    >
                      Update
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
  return <div>{flyout}</div>;
};
