/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { HashRouter, Redirect, Route, Switch, useHistory } from 'react-router-dom';

const Services = lazy(() =>
  import('./pages/services').then((module) => ({ default: module.Services }))
);
const ServiceDetails = lazy(() =>
  import('./pages/service_details/service_details').then((module) => ({
    default: module.ServiceDetails,
  }))
);

const RouteSpinner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Suspense fallback={<EuiLoadingSpinner size="l" />}>{children}</Suspense>;
};

export interface ApmHomeProps {
  chrome: any;
  parentBreadcrumb: any;
  [key: string]: any;
}

const ApmRouter: React.FC<ApmHomeProps> = (props) => {
  const history = useHistory();

  const handleServiceClick = (serviceName: string, environment: string) => {
    history.push(
      `/service-details/${encodeURIComponent(serviceName)}/${encodeURIComponent(environment)}`
    );
  };

  return (
    <Switch>
      <Route
        path="/services"
        exact={true}
        render={() => (
          <RouteSpinner>
            <Services {...props} onServiceClick={handleServiceClick} />
          </RouteSpinner>
        )}
      />
      <Route
        path="/service-details/:serviceName/:environment"
        exact={true}
        render={({ match }) => (
          <RouteSpinner>
            <ServiceDetails
              {...props}
              serviceName={decodeURIComponent(match.params.serviceName)}
              environment={decodeURIComponent(match.params.environment)}
            />
          </RouteSpinner>
        )}
      />
      <Route path="*" render={() => <Redirect to="/services" />} />
    </Switch>
  );
};

/**
 * APM Home - Router for APM pages
 *
 * Routes:
 * - /services - Services list page
 * - /service-details/:serviceName/:environment - Service details page
 */
export const ApmHome: React.FC<ApmHomeProps> = (props) => {
  return (
    <HashRouter>
      <ApmRouter {...props} />
    </HashRouter>
  );
};
