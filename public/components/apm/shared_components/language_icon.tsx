/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import {
  JavaPlain,
  PythonOriginalWordmark,
  JavascriptPlain,
  NodejsPlain,
  GoOriginalWordmark,
  RubyPlain,
  PhpPlain,
  RustOriginal,
  CplusplusPlain,
  SwiftPlain,
  CsharpPlain,
  ErlangOriginal,
  ElixirOriginal,
} from 'devicons-react/lib/index';

interface LanguageIconProps {
  language?: string;
  size?: 's' | 'm' | 'l';
}

// Language to devicon component mapping
// Maps OpenTelemetry SDK language names to devicons-react components
// Covers all OpenTelemetry SDK supported languages
// See: https://devicons-react.vercel.app/
const LANGUAGE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  java: JavaPlain,
  python: PythonOriginalWordmark,
  js: JavascriptPlain,
  javascript: JavascriptPlain,
  nodejs: NodejsPlain,
  node: NodejsPlain,
  go: GoOriginalWordmark,
  golang: GoOriginalWordmark,
  ruby: RubyPlain,
  php: PhpPlain,
  rust: RustOriginal,
  cpp: CplusplusPlain,
  'c++': CplusplusPlain,
  swift: SwiftPlain,
  dotnet: CsharpPlain,
  '.net': CsharpPlain,
  csharp: CsharpPlain,
  'c#': CsharpPlain,
  erlang: ErlangOriginal,
  elixir: ElixirOriginal,
};

/**
 * LanguageIcon - Displays SDK language icon for a service
 *
 * Shows devicon for supported languages, EUI gear icon for unknown/empty.
 * Language detected from service's `telemetry.sdk.language` attribute.
 *
 * @param language - Language string from OpenTelemetry SDK (optional)
 * @param size - Icon size ('s', 'm', 'l')
 */
export const LanguageIcon: React.FC<LanguageIconProps> = ({ language, size = 'm' }) => {
  // Handle missing or empty language - show gear icon
  if (!language || language.trim() === '') {
    return <EuiIcon type="gear" size={size} />;
  }

  const normalizedLang = language.toLowerCase().trim();
  const IconComponent = LANGUAGE_ICON_MAP[normalizedLang];

  // Unknown language - show gear icon
  if (!IconComponent) {
    return <EuiIcon type="gear" size={size} />;
  }

  // Map EUI size to pixel size
  const iconSize = size === 's' ? 16 : size === 'm' ? 20 : 24;

  return (
    <div
      style={{
        width: iconSize,
        height: iconSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label={`${language} language icon`}
    >
      <IconComponent size={iconSize} />
    </div>
  );
};
