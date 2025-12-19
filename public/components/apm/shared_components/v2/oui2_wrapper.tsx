/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface OUI2WrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that enables OUI 2.0 Tailwind utilities with oui: prefix
 * Applies the .oui2 scope required for scoped CSS to work
 */
export const OUI2Wrapper: React.FC<OUI2WrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`oui2 ${className}`}>
      {children}
      <div className="oui2-end" />
    </div>
  );
};
