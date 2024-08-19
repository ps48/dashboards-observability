/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { SAVED_TRACESOURCE, TraceAnalyticsMode } from '../../../../../common/types/trace_analytics';
import { OSDSavedTraceSourceClient } from '../../../../services/saved_objects/saved_object_client/osd_saved_objects/saved_trace_sources';
import { ObservabilitySavedTraceSources } from '../../../../services/saved_objects/saved_object_client/types';
import { useToast } from '../../../common/toast';
import { CustomSourceFlyout } from '../common/custom_source/custom_source_flyout';

export function DataSourcePicker(props: {
  modes: {
    id: string;
    title: string;
  }[];
  selectedMode: TraceAnalyticsMode;
  setMode: (mode: TraceAnalyticsMode) => void;
}) {
  const { setToast } = useToast();
  const { modes, selectedMode, setMode } = props;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [customSources, setcustomSources] = useState<Array<ObservabilitySavedTraceSources>>([]);
  const [defaultSource, setDefaultSource] = useState<ObservabilitySavedTraceSources>(
    {} as ObservabilitySavedTraceSources
  );

  let labels = new Map([
    ['jaeger', 'Jaeger'],
    ['data_prepper', 'Data Prepper'],
  ]);

  const loadSources = () => {
    OSDSavedTraceSourceClient.getInstance()
      .getBulk()
      .then((res) => {
        setcustomSources(res.observabilityObjectList);
        res.observabilityObjectList.forEach((o) => {
          if (SAVED_TRACESOURCE in o && o.traceSource.isDefault === true) {
            setDefaultSource(o);
          }
        });
      })
      .catch((_error) => {
        setToast('Failed to load custom sources', 'danger');
      });
  };

  useEffect(() => {
    loadSources();
  }, []);

  const trigger = {
    label: defaultSource?.traceSource?.name ?? labels.get(selectedMode),
    title: defaultSource?.traceSource?.name ?? labels.get(selectedMode),
    'data-test-subj': 'indexPattern-switch-link',
    className: 'dscIndexPattern__triggerButton',
  };

  const createTrigger = () => {
    const { label, title, ...rest } = trigger;
    return (
      <EuiButtonEmpty
        flush="left"
        color="text"
        iconSide="right"
        iconType="arrowDown"
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        {...rest}
      >
        {label}
      </EuiButtonEmpty>
    );
  };

  return (
    <>
      <EuiPopover
        button={createTrigger()}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        className="eui-textTruncate"
        anchorClassName="eui-textTruncate"
        display="inlineBlock"
        panelPaddingSize="s"
        ownFocus
      >
        <div className="popOverContainer">
          <EuiPopoverTitle>{'Choose data schema'}</EuiPopoverTitle>
          <EuiSelectable
            data-test-subj="indexPattern-switcher"
            searchable
            singleSelection="always"
            options={modes.map((x) => ({
              label: x.title,
              key: x.id,
              value: x.id,
              checked: x.id === selectedMode ? 'on' : undefined,
              'data-test-subj': x.id + '-mode',
              append: <EuiBadge>type</EuiBadge>,
            }))}
            onChange={(choices) => {
              const choice = (choices.find(({ checked }) => checked) as unknown) as {
                value: string;
                label: string;
                key: TraceAnalyticsMode;
              };
              setMode(choice.key);
              setPopoverIsOpen(false);
              sessionStorage.setItem('TraceAnalyticsMode', choice.key);
            }}
            searchProps={{
              compressed: true,
            }}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
          <EuiButton
            onClick={() => {
              setIsFlyoutVisible(true);
              setPopoverIsOpen(false);
            }}
            size="s"
          >
            Manage custom trace indices
          </EuiButton>
        </div>
      </EuiPopover>
      <CustomSourceFlyout
        isFlyoutVisible={isFlyoutVisible}
        setIsFlyoutVisible={setIsFlyoutVisible}
        loadSources={loadSources}
        customSources={customSources}
      />
    </>
  );
}
