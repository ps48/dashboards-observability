/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { configureStore } from '@reduxjs/toolkit';
import { waitFor } from '@testing-library/react';
import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import toJson from 'enzyme-to-json';
import React from 'react';
import { Provider, useDispatch } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import { DEFAULT_DATA_SOURCE_TYPE } from '../../../../../../common/constants/data_sources';
import {
  AVAILABLE_FIELDS,
  QUERIED_FIELDS,
  SELECTED_FIELDS,
  UNSELECTED_FIELDS,
} from '../../../../../../common/constants/explorer';
import {
  JSON_DATA,
  JSON_DATA_ALL,
  QUERY_FIELDS,
  AVAILABLE_FIELDS as SIDEBAR_AVAILABLE_FIELDS,
} from '../../../../../../test/event_analytics_constants';
import { rootReducer } from '../../../../../framework/redux/reducers';
import { Sidebar } from '../sidebar';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('Siderbar component', () => {
  configure({ adapter: new Adapter() });
  const store = configureStore({
    reducer: jest.fn(),
  });
  beforeEach(() => {
    useDispatch.mockClear();
    useDispatch.mockReturnValue(jest.fn());
  });

  it('Renders empty sidebar component', async () => {
    const explorerFields = {
      [SELECTED_FIELDS]: [],
      [AVAILABLE_FIELDS]: [],
      [UNSELECTED_FIELDS]: [],
      [QUERIED_FIELDS]: [],
    };
    const handleOverrideTimestamp = jest.fn();
    const selectedTimestamp = 'timestamp';
    const explorerData = {};

    const wrapper = mount(
      <Provider store={store}>
        <Sidebar
          explorerFields={explorerFields}
          explorerData={explorerData}
          selectedTimestamp={selectedTimestamp}
          handleOverrideTimestamp={handleOverrideTimestamp}
          isFieldToggleButtonDisabled={false}
          isOverridingTimestamp={false}
        />
      </Provider>
    );

    wrapper.update();

    await waitFor(() => {
      expect(
        toJson(wrapper, {
          mode: 'deep',
        })
      ).toMatchSnapshot();
    });
  });

  it('Renders sidebar component', async () => {
    const explorerFields = {
      [SELECTED_FIELDS]: [],
      [UNSELECTED_FIELDS]: [],
      [AVAILABLE_FIELDS]: SIDEBAR_AVAILABLE_FIELDS,
      [QUERIED_FIELDS]: QUERY_FIELDS,
    };
    const handleOverrideTimestamp = jest.fn();
    const selectedTimestamp = 'timestamp';
    const explorerData = {
      jsonData: JSON_DATA,
      jsonDataAll: JSON_DATA_ALL,
    };
    const astore = createStore(rootReducer, applyMiddleware(thunk));

    const wrapper = mount(
      <Provider store={astore}>
        <Sidebar
          explorerFields={explorerFields}
          explorerData={explorerData}
          selectedTimestamp={selectedTimestamp}
          handleOverrideTimestamp={handleOverrideTimestamp}
          isFieldToggleButtonDisabled={false}
          isOverridingTimestamp={false}
          storedExplorerFields={explorerFields}
          tabId={DEFAULT_DATA_SOURCE_TYPE}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(
        toJson(wrapper, {
          mode: 'deep',
        })
      ).toMatchSnapshot();
    });
  });
});
