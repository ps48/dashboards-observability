/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiCheckbox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import React, { Fragment } from 'react';
import { traceSchemaOptions } from '../../../../../../common/constants/trace_analytics';
import { TraceAnalyticsMode, TraceSource } from '../../../../../../common/types/trace_analytics';

interface CustomSourceFormProps {
  formState: TraceSource;
  setFormState: React.Dispatch<React.SetStateAction<TraceSource>>;
}

export const CustomSourceForm = ({ formState, setFormState }: CustomSourceFormProps) => {
  return (
    <>
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={<h3>Name trace source</h3>}
        description={<Fragment>Name custom source for trace analytics</Fragment>}
      >
        <EuiFormRow label="Name trace source">
          <EuiFieldText
            placeholder="Trace source name"
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            aria-label="Trace source name"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={<h3>Add trace source description</h3>}
        description={<Fragment>Describe the trace source</Fragment>}
      >
        <EuiFormRow label="Add trace source description">
          <EuiFieldText
            placeholder="Add source description"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            aria-label="Add source description"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={<h3>Select schema</h3>}
        description={<Fragment>Select schema of indices</Fragment>}
      >
        <EuiFormRow label="Select schema">
          <EuiSuperSelect
            options={traceSchemaOptions}
            valueOfSelected={formState.type}
            onChange={(value) => setFormState({ ...formState, type: value as TraceAnalyticsMode })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
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
            value={formState.spanIndices}
            onChange={(e) => setFormState({ ...formState, spanIndices: e.target.value })}
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
            value={formState.serviceIndices}
            onChange={(e) => setFormState({ ...formState, serviceIndices: e.target.value })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={<h3>Make source default</h3>}
        description={<Fragment>Make this source default for trace analytics</Fragment>}
      >
        <EuiFormRow>
          <EuiCheckbox
            id="default-check-box"
            label="Make this source default"
            checked={formState.isDefault}
            onChange={(e) => setFormState({ ...formState, isDefault: e.target.checked })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
