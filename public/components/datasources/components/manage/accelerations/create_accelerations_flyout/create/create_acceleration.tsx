/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import {
  ACCELERATION_DEFUALT_SKIPPING_INDEX_NAME,
  ACCELERATION_TIME_INTERVAL,
} from '../../../../../../../../common/constants/data_sources';
import { CreateAccelerationForm } from '../../../../../../../../common/types/data_connections';
import { coreRefs } from '../../../../../../../framework/core_refs';
import { IndexAdvancedSettings } from '../selectors/index_advanced_settings';
import { IndexSettingOptions } from '../selectors/index_setting_options';
import { IndexTypeSelector } from '../selectors/index_type_selector';
import { PreviewSQLDefinition } from '../selectors/preview_sql_defintion';
import { AccelerationDataSourceSelector } from '../selectors/source_selector';
import { QueryVisualEditor } from '../visual_editors/query_visual_editor';
import { CreateAccelerationHeader } from './create_acceleration_header';
import { formValidator, hasError } from './utils';

export interface CreateAccelerationProps {
  selectedDatasource: string;
  resetFlyout: () => void;
  databaseName?: string;
  tableName?: string;
}

export const CreateAcceleration = ({
  selectedDatasource,
  resetFlyout,
  databaseName,
  tableName,
}: CreateAccelerationProps) => {
  const http = coreRefs!.http;
  const [accelerationFormData, setAccelerationFormData] = useState<CreateAccelerationForm>({
    dataSource: selectedDatasource,
    dataTable: tableName ?? '',
    database: databaseName ?? '',
    dataTableFields: [],
    accelerationIndexType: 'skipping',
    skippingIndexQueryData: [],
    coveringIndexQueryData: [],
    materializedViewQueryData: {
      columnsValues: [],
      groupByTumbleValue: {
        timeField: '',
        tumbleWindow: 0,
        tumbleInterval: '',
      },
    },
    accelerationIndexName: ACCELERATION_DEFUALT_SKIPPING_INDEX_NAME,
    primaryShardsCount: 1,
    replicaShardsCount: 1,
    refreshType: 'auto',
    checkpointLocation: undefined,
    watermarkDelay: {
      delayWindow: 1,
      delayInterval: ACCELERATION_TIME_INTERVAL[1].value,
    },
    refreshIntervalOptions: {
      refreshWindow: 1,
      refreshInterval: ACCELERATION_TIME_INTERVAL[1].value,
    },
    formErrors: {
      dataSourceError: [],
      databaseError: [],
      dataTableError: [],
      skippingIndexError: [],
      coveringIndexError: [],
      materializedViewError: [],
      indexNameError: [],
      primaryShardsError: [],
      replicaShardsError: [],
      refreshIntervalError: [],
      checkpointLocationError: [],
      watermarkDelayError: [],
    },
  });

  const copyToEditor = () => {
    const errors = formValidator(accelerationFormData);
    if (hasError(errors)) {
      setAccelerationFormData({ ...accelerationFormData, formErrors: errors });
      return;
    }
    // TODO: add -> updateQueries(accelerationQueryBuilder(accelerationFormData));
    resetFlyout();
  };

  return (
    <>
      <EuiFlyout ownFocus onClose={resetFlyout} aria-labelledby="flyoutTitle" size="m">
        <EuiFlyoutHeader hasBorder>
          <CreateAccelerationHeader />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSpacer size="l" />
          <EuiForm
            isInvalid={hasError(accelerationFormData.formErrors)}
            error={Object.values(accelerationFormData.formErrors).flat()}
            component="div"
            id="acceleration-form"
          >
            <AccelerationDataSourceSelector
              http={http!}
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
              selectedDatasource={selectedDatasource}
            />
            <EuiSpacer size="xxl" />
            <IndexTypeSelector
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
            />
            <EuiSpacer size="xxl" />
            <IndexSettingOptions
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
            />
            <EuiSpacer size="m" />
            <QueryVisualEditor
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
            />
            <EuiSpacer size="xxl" />
            <IndexAdvancedSettings
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
            />
            <EuiSpacer size="l" />
            <PreviewSQLDefinition
              accelerationFormData={accelerationFormData}
              setAccelerationFormData={setAccelerationFormData}
            />
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={resetFlyout} flush="left">
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={copyToEditor} fill>
                Create acceleration
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
