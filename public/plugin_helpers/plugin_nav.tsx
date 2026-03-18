/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CoreSetup,
  AppCategory,
  DEFAULT_NAV_GROUPS,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
import {
  observabilityApplicationsID,
  observabilityGettingStartedID,
  observabilityIntegrationsID,
  observabilityMetricsID,
  observabilityNotebookID,
  observabilityOverviewID,
} from '../../common/constants/shared';
import {
  observabilityApmServicesID,
  observabilityApmApplicationMapID,
} from '../../common/constants/apm';
import { AppPluginStartDependencies } from '../types';

export function registerAllPluginNavGroups(
  core: CoreSetup<AppPluginStartDependencies>,
  apmEnabled: boolean,
  applicationMonitoringCategory: AppCategory
) {
  const enableIconSideNav = core.uiSettings.get('home:enableIconSideNav', false);

  if (enableIconSideNav) {
    // Icon side nav layout — reorganized for observability workspace
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      // Top-level: Application Map
      {
        id: observabilityApmApplicationMapID,
        category: undefined,
        order: 500,
        title: 'Application Map',
        euiIconType: 'globe',
      },
      // Application Monitoring category
      {
        id: 'observability-traces-nav',
        category: applicationMonitoringCategory,
        order: 4100,
        title: 'Traces',
        euiIconType: 'apmTrace',
      },
      {
        id: 'observability-services-nav',
        category: applicationMonitoringCategory,
        order: 4200,
        title: 'Services',
        euiIconType: 'graphApp',
      },
      // APM items under Application Monitoring (if enabled)
      ...(apmEnabled
        ? [
            {
              id: observabilityApmServicesID,
              category: applicationMonitoringCategory,
              order: 4300,
              euiIconType: 'graphApp',
            },
          ]
        : []),
      // Tools category
      {
        id: observabilityNotebookID,
        category: DEFAULT_APP_CATEGORIES.observabilityTools,
        order: 5100,
        euiIconType: 'notebookApp',
      },
      // Settings category
      {
        id: observabilityIntegrationsID,
        category: DEFAULT_APP_CATEGORIES.observabilitySettings,
        order: 9510,
      },
    ]);
  } else {
    // Existing registrations — UNCHANGED
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityOverviewID,
        category: undefined,
        order: 10,
        showInAllNavGroup: true,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityGettingStartedID,
        category: undefined,
        order: 20,
        showInAllNavGroup: true,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityApplicationsID,
        category: DEFAULT_APP_CATEGORIES.investigate,
        order: 400,
        showInAllNavGroup: true,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityIntegrationsID,
        category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
        order: 500,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityMetricsID,
        category: DEFAULT_APP_CATEGORIES.investigate,
        showInAllNavGroup: true,
        order: 200,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: observabilityNotebookID,
        category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
        order: 400,
      },
    ]);

    if (apmEnabled) {
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
        {
          id: observabilityApmServicesID,
          category: applicationMonitoringCategory,
          showInAllNavGroup: true,
          order: 100,
        },
        {
          id: observabilityApmApplicationMapID,
          category: applicationMonitoringCategory,
          showInAllNavGroup: true,
          order: 200,
        },
        {
          id: 'observability-traces-nav',
          category: DEFAULT_APP_CATEGORIES.investigate,
          showInAllNavGroup: true,
          order: 300,
        },
        {
          id: 'observability-services-nav',
          category: DEFAULT_APP_CATEGORIES.investigate,
          showInAllNavGroup: true,
          order: 100,
        },
      ]);
    } else {
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
        {
          id: 'observability-traces-nav',
          category: DEFAULT_APP_CATEGORIES.investigate,
          showInAllNavGroup: true,
          order: 300,
        },
        {
          id: 'observability-services-nav',
          category: DEFAULT_APP_CATEGORIES.investigate,
          showInAllNavGroup: true,
          order: 100,
        },
      ]);
    }
  }

  // Non-observability registrations stay unchanged regardless of flag
  core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
    {
      id: observabilityIntegrationsID,
      category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
      order: 500,
    },
  ]);

  core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS[`security-analytics`], [
    {
      id: observabilityNotebookID,
      category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
      order: 400,
    },
  ]);
  core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
    {
      id: observabilityNotebookID,
      category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
      order: 400,
    },
  ]);
}
