/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import { TraceSource } from '../../../../../../common/types/trace_analytics';
import { ObservabilitySavedObject } from '../../../../../services/saved_objects/saved_object_client/types';
import { CustomSourceForm } from './custom_source_form';

interface ManageCustomSourcesProps {
  formState: TraceSource;
  setFormState: React.Dispatch<React.SetStateAction<TraceSource>>;
  selectedOptions: Array<EuiComboBoxOptionOption>;
  setSelectedOptions: React.Dispatch<React.SetStateAction<Array<EuiComboBoxOptionOption>>>;
  customSources: ObservabilitySavedObject[];
}

export const ManageCustomSources = ({
  formState,
  setFormState,
  selectedOptions,
  setSelectedOptions,
  customSources,
}: ManageCustomSourcesProps) => {
  const [selectOptions, setSelectOptions] = useState<Array<EuiComboBoxOptionOption>>([]);

  useEffect(() => {
    const sources = customSources.map((o) => ({
      value: o.objectId,
      label: o.traceSource.name,
    }));
    setSelectOptions(sources);
  }, [customSources]);

  useEffect(() => {
    if (selectedOptions.length > 0) {
      const filteredSource = customSources.filter(
        (source) => source.objectId === selectedOptions[0].value
      );
      if (filteredSource.length > 0)
        setFormState({
          ...filteredSource[0].traceSource,
        });
    }
  }, [selectedOptions, setFormState, customSources]);

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiDescribedFormGroup
        title={<h3>Select source</h3>}
        description={<Fragment>Select a custom trace source to be updated</Fragment>}
      >
        <EuiFormRow label="Select source">
          <EuiComboBox
            placeholder="Select a custom source"
            singleSelection={{ asPlainText: true }}
            options={selectOptions}
            selectedOptions={selectedOptions}
            onChange={(_selectedOptions) => setSelectedOptions(_selectedOptions)}
            isClearable
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      {selectedOptions.length > 0 && (
        <CustomSourceForm formState={formState} setFormState={setFormState} />
      )}
    </>
  );
};
