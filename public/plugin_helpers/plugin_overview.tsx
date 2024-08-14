/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ContentManagementPluginSetup } from '../../../../src/plugins/content_management/public';

export const HOME_PAGE_ID = 'observabilityOverviewPage';
export enum SECTIONS {
  GET_STARTED = 'get_started',
  SELECTOR = 'selector',
  DASHBOARD = 'dashboard',
}

export enum HOME_CONTENT_AREAS {
  GET_STARTED = `${HOME_PAGE_ID}/${SECTIONS.GET_STARTED}`,
  SELECTOR = `${HOME_PAGE_ID}/${SECTIONS.SELECTOR}`,
  DASHBOARD = `${HOME_PAGE_ID}/${SECTIONS.DASHBOARD}`,
}

export const setupOverviewPage = (contentManagement: ContentManagementPluginSetup) => {
  contentManagement.registerPage({
    id: HOME_PAGE_ID,
    title: 'Home',
    sections: [
      {
        id: SECTIONS.SELECTOR,
        order: 2000,
        title: 'Selector Section',
        kind: 'custom',
        render: (contents) => (
          <>
            {contents.map((content, index) =>
              content.kind === 'custom' ? (
                <React.Fragment key={index}>{content.render()}</React.Fragment>
              ) : null
            )}
          </>
        ),
      },
      {
        id: SECTIONS.DASHBOARD,
        order: 3000,
        kind: 'dashboard',
      },
      {
        id: SECTIONS.GET_STARTED,
        order: 1000,
        title: 'Get started',
        kind: 'card',
        wrap: false,
        columns: 5,
      },
    ],
  });
};