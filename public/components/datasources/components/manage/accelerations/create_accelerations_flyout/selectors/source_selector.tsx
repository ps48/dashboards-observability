/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import producer from 'immer';
import React, { useEffect, useState } from 'react';
import { CoreStart } from '../../../../../../../../../../src/core/public';
import { DATACONNECTIONS_BASE } from '../../../../../../../../common/constants/shared';
import {
  CachedDataSourceStatus,
  CreateAccelerationForm,
} from '../../../../../../../../common/types/data_connections';
import { CatalogCacheManager } from '../../../../../../../framework/catalog_cache/cache_manager';
import { useToast } from '../../../../../../common/toast';
import { hasError, validateDataTable, validateDatabase } from '../create/utils';
import { SelectorLoadDatabases } from './selector_helpers/selector_load_databases';
import { SelectorLoadObjects } from './selector_helpers/selector_load_objects';

interface AccelerationDataSourceSelectorProps {
  http: CoreStart['http'];
  accelerationFormData: CreateAccelerationForm;
  setAccelerationFormData: React.Dispatch<React.SetStateAction<CreateAccelerationForm>>;
  selectedDatasource: string;
}

export const AccelerationDataSourceSelector = ({
  http,
  accelerationFormData,
  setAccelerationFormData,
  selectedDatasource,
}: AccelerationDataSourceSelectorProps) => {
  const { setToast } = useToast();
  const [databases, setDatabases] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [tables, setTables] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedTable, setSelectedTable] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [loadingComboBoxes, setLoadingComboBoxes] = useState({
    dataSource: false,
    database: false,
    dataTable: false,
  });

  const loadDataSource = () => {
    setLoadingComboBoxes({ ...loadingComboBoxes, dataSource: true });
    http
      .get(DATACONNECTIONS_BASE)
      .then((res) => {
        const isValidDataSource = res.some(
          (connection: any) =>
            connection.connector.toUpperCase() === 'S3GLUE' &&
            connection.name === selectedDatasource
        );

        if (!isValidDataSource) {
          setToast(`Received an invalid datasource in create acceleration flyout`, 'danger');
        }
      })
      .catch((err) => {
        console.error(err);
        setToast(`failed to load datasources`, 'danger');
      });
    setLoadingComboBoxes({ ...loadingComboBoxes, dataSource: false });
  };

  const loadDatabases = () => {
    setLoadingComboBoxes({ ...loadingComboBoxes, database: true });
    const dsCache = CatalogCacheManager.getOrCreateDataSource(accelerationFormData.dataSource);

    if (dsCache.status === CachedDataSourceStatus.Updated && dsCache.databases.length > 0) {
      const databaseLabels = dsCache.databases.map((db) => ({ label: db.name }));
      setDatabases(databaseLabels);

      const dbExists =
        accelerationFormData.database !== '' &&
        databaseLabels.some((db) => db.label === accelerationFormData.database);

      if (dbExists) {
        setSelectedDatabase([{ label: accelerationFormData.database }]);
      }
    } else if (
      (dsCache.status === CachedDataSourceStatus.Updated && dsCache.databases.length === 0) ||
      dsCache.status === CachedDataSourceStatus.Empty
    ) {
      setDatabases([]);
    }
    setLoadingComboBoxes({ ...loadingComboBoxes, database: false });
  };

  const loadTables = () => {
    if (selectedDatabase.length > 0) {
      const dbCache = CatalogCacheManager.getDatabase(
        selectedDatasource,
        selectedDatabase[0].label
      );
      if (dbCache.status === CachedDataSourceStatus.Updated && dbCache.tables.length > 0) {
        const tableLabels = dbCache.tables.map((tb) => ({ label: tb.name }));
        setTables(tableLabels);

        const tbExists =
          accelerationFormData.dataTable !== '' &&
          tableLabels.some((tb) => tb.label === accelerationFormData.dataTable);

        if (tbExists) {
          setSelectedTable([{ label: accelerationFormData.dataTable }]);
        }
      } else if (
        (dbCache.status === CachedDataSourceStatus.Updated && dbCache.tables.length === 0) ||
        dbCache.status === CachedDataSourceStatus.Empty
      ) {
        setTables([]);
        setSelectedTable([]);
      }
    }
  };

  useEffect(() => {
    loadDataSource();
  }, []);

  useEffect(() => {
    if (accelerationFormData.dataSource !== '') {
      loadDatabases();
    }
  }, [accelerationFormData.dataSource]);

  useEffect(() => {
    console.log('load tables triggered ds status: ', accelerationFormData.database);
    if (accelerationFormData.database !== '') {
      loadTables();
    }
  }, [accelerationFormData.database]);

  return (
    <>
      <EuiText data-test-subj="datasource-selector-header">
        <h3>Select data source</h3>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        Select the data source to accelerate data from. External data sources may take time to load.
      </EuiText>
      <EuiSpacer size="m" />
      <EuiDescriptionList>
        <EuiDescriptionListTitle>Data source</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{selectedDatasource}</EuiDescriptionListDescription>
      </EuiDescriptionList>
      <EuiSpacer size="m" />
      <EuiFormRow
        label="Database"
        helpText="Select the database that contains the tables you'd like to use."
        isInvalid={hasError(accelerationFormData.formErrors, 'databaseError')}
        error={accelerationFormData.formErrors.databaseError}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiComboBox
              placeholder="Select a database"
              singleSelection={{ asPlainText: true }}
              options={databases}
              selectedOptions={selectedDatabase}
              onChange={(databaseOptions) => {
                console.log('db list updated');
                if (databaseOptions.length > 0) {
                  console.log('updating acc data');
                  setAccelerationFormData(
                    producer((accData) => {
                      accData.database = databaseOptions[0].label;
                      accData.formErrors.databaseError = validateDatabase(databaseOptions[0].label);
                    })
                  );
                  setSelectedDatabase(databaseOptions);
                }
              }}
              isClearable={false}
              isInvalid={hasError(accelerationFormData.formErrors, 'databaseError')}
              isLoading={loadingComboBoxes.database}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectorLoadDatabases
              dataSourceName={accelerationFormData.dataSource}
              loadDatabases={loadDatabases}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        label="Table"
        helpText="Select the Spark table that has the data you would like to index."
        isInvalid={hasError(accelerationFormData.formErrors, 'dataTableError')}
        error={accelerationFormData.formErrors.dataTableError}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiComboBox
              placeholder="Select a table"
              singleSelection={{ asPlainText: true }}
              options={tables}
              selectedOptions={selectedTable}
              onChange={(tableOptions) => {
                if (tableOptions.length > 0) {
                  setAccelerationFormData(
                    producer((accData) => {
                      accData.dataTable = tableOptions[0].label;
                      accData.formErrors.dataTableError = validateDataTable(tableOptions[0].label);
                    })
                  );
                  setSelectedTable(tableOptions);
                }
              }}
              isClearable={false}
              isInvalid={hasError(accelerationFormData.formErrors, 'dataTableError')}
              isLoading={loadingComboBoxes.dataTable}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectorLoadObjects
              dataSourceName={accelerationFormData.dataSource}
              databaseName={accelerationFormData.database}
              loadTables={loadTables}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};
