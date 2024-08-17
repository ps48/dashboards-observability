/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import {
  TRACE_CUSTOM_SERVICE_INDEX_SETTING,
  TRACE_CUSTOM_SPAN_INDEX_SETTING,
} from '../../../../../common/constants/trace_analytics';
import { uiSettingsService } from '../../../../../common/utils';
import { OSDSavedTraceSourceClient } from '../../../../services/saved_objects/saved_object_client/osd_saved_objects/saved_trace_sources';
import { useToast } from '../../../common/toast';

interface CustomIndexFlyoutProps {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CustomIndexFlyout = ({
  isFlyoutVisible,
  setIsFlyoutVisible,
}: CustomIndexFlyoutProps) => {
  const { setToast } = useToast();
  const [spanIndices, setSpanIndices] = useState('');
  const [serviceIndices, setServiceIndices] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onChangeSpanIndices = (e: { target: { value: React.SetStateAction<string> } }) => {
    setSpanIndices(e.target.value);
  };

  const onChangeServiceIndices = (e: { target: { value: React.SetStateAction<string> } }) => {
    setServiceIndices(e.target.value);
  };

  useEffect(() => {
    setSpanIndices(uiSettingsService.get(TRACE_CUSTOM_SPAN_INDEX_SETTING));
    setServiceIndices(uiSettingsService.get(TRACE_CUSTOM_SERVICE_INDEX_SETTING));
  }, [uiSettingsService]);

  const onSaveIndices = async () => {
    try {
      setIsLoading(true);
      // await uiSettingsService.set(TRACE_CUSTOM_SPAN_INDEX_SETTING, spanIndices);
      // await uiSettingsService.set(TRACE_CUSTOM_SERVICE_INDEX_SETTING, serviceIndices);
      OSDSavedTraceSourceClient.getInstance().create({
        name: 'saved-trace-dp',
        description: '',
        type: 'data_prepper',
        spanIndices: 'dest1:otel-v1-apm-span-*,dest2:otel-v1-apm-span-*',
        serviceIndices: 'dest1:otel-v1-apm-services-*,dest2:otel-v1-apm-services-*',
      });
      setIsLoading(false);
      setToast('Updated trace analytics indices successfully', 'success');
    } catch (error) {
      console.error(error);
      setToast('Failed to update trace analytics indices', 'danger');
    }
    setIsLoading(false);
  };

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setIsFlyoutVisible(false)} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h3 id="flyoutTitle">Add custom trace source</h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiDescribedFormGroup
            title={<h3>Custom span indices</h3>}
            description={
              <Fragment>
                Configure custom span indices to be used by the trace analytics plugin
              </Fragment>
            }
          >
            <EuiFormRow label="Custom span indices">
              <EuiFieldText
                name="spanIndices"
                aria-label="spanIndices"
                placeholder="index1,cluster1:index2,cluster:index3"
                value={spanIndices}
                onChange={onChangeSpanIndices}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiDescribedFormGroup
            title={<h3>Custom service indices</h3>}
            description={
              <Fragment>
                Configure custom service indices to be used by the trace analytics plugin
              </Fragment>
            }
          >
            <EuiFormRow label="Custom service indices">
              <EuiFieldText
                name="serviceIndices"
                aria-label="serviceIndices"
                placeholder="index1,cluster1:index2,cluster:index3"
                value={serviceIndices}
                onChange={onChangeServiceIndices}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={() => setIsFlyoutVisible(false)}
                flush="left"
              >
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  await onSaveIndices();
                  setIsFlyoutVisible(false);
                }}
                fill
                isLoading={isLoading}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
  return <div>{flyout}</div>;
};
