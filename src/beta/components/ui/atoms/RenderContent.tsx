'use client';

import type React from 'react';
import { type Content, isTypographicContent } from '@/beta/types/content';
import { RenderTypographicContent } from './RenderTypographicContent';
import { AddressCorrelationDetails } from '../molecules/attributes/privacy/AddressCorrelationDetails';
import { ChainVerificationDetails } from '../molecules/attributes/security/ChainVerificationDetails';
import { FundingDetails } from '../molecules/attributes/transparency/FundingDetails';
import { LicenseDetails } from '../molecules/attributes/transparency/LicenseDetails';
import { SourceVisibilityDetails } from '../molecules/attributes/transparency/SourceVisibilityDetails';
import { UnratedAttribute } from '../molecules/attributes/UnratedAttribute';

export function RenderContent({
  content,
  ...otherProps
}:
  | { content: Content }
  | React.ComponentProps<typeof RenderTypographicContent>): React.JSX.Element {
  if (isTypographicContent(content)) {
    return <RenderTypographicContent content={content} {...otherProps} />;
  }
  const { component, componentProps } = content.component;
  switch (component) {
    case 'AddressCorrelationDetails':
      return <AddressCorrelationDetails {...componentProps} {...otherProps} />;
    case 'ChainVerificationDetails':
      return <ChainVerificationDetails {...componentProps} {...otherProps} />;
    case 'FundingDetails':
      return <FundingDetails {...componentProps} {...otherProps} />;
    case 'LicenseDetails':
      return <LicenseDetails {...componentProps} {...otherProps} />;
    case 'SourceVisibilityDetails':
      return <SourceVisibilityDetails {...componentProps} {...otherProps} />;
    case 'UnratedAttribute':
      return <UnratedAttribute {...componentProps} {...otherProps} />;
  }
}
