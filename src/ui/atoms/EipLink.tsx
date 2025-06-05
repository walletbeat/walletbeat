import { Divider, Link, Typography, styled } from '@mui/material';
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip';
import React, { useState } from 'react';

import { type Eip, eipEthereumDotOrgUrl, eipLabel, eipShortLabel } from '@/schema/eips';

import { MarkdownBox } from './MarkdownBox';

const EipTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    minWidth: '400px',
  },
});

export function EipLink({
  eip,
  format,
}: {
  eip: Eip;
  format: 'SHORT' | 'LONG';
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <EipTooltip
      title={
        <React.Fragment key={`eip-tooltip-${eip.number}`}>
          <Typography
            variant='h4'
            sx={{
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            {eipLabel(eip)}
          </Typography>
          <Divider
            orientation='horizontal'
            variant='middle'
            flexItem={true}
            sx={{
              marginLeft: '1%',
              marginRight: '1%',
              marginTop: '0rem',
              marginBottom: '0.5rem',
              filter: 'invert(100%)',
            }}
          />
          <MarkdownBox markdownTransform={markdown => `**Summary**: ${markdown}`}>
            {eip.summaryMarkdown}
          </MarkdownBox>
          <Divider
            orientation='horizontal'
            variant='middle'
            flexItem={true}
            sx={{
              marginLeft: '20%',
              marginRight: '20%',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              filter: 'invert(100%)',
            }}
          />
          <MarkdownBox markdownTransform={markdown => `**Why?** ${markdown}`}>
            {eip.whyItMattersMarkdown}
          </MarkdownBox>
          {eip.noteMarkdown === undefined ? null : (
            <>
              <Divider
                orientation='horizontal'
                variant='middle'
                flexItem={true}
                sx={{
                  marginLeft: '20%',
                  marginRight: '20%',
                  marginTop: '0.5rem',
                  marginBottom: '0.5rem',
                  filter: 'invert(100%)',
                }}
              />
              <MarkdownBox markdownTransform={markdown => `**Note**: ${markdown}`}>
                {eip.noteMarkdown}
              </MarkdownBox>
            </>
          )}
        </React.Fragment>
      }
      arrow={true}
    >
      <Link
        href={eipEthereumDotOrgUrl(eip)}
        target='_blank'
        color='primary'
        display='inline-block'
        underline='none'
        onMouseEnter={() => {
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
        sx={{
          color: 'var(--accent)',
          textDecoration: hovered ? 'underline' : 'none',
          className: 'eip-tag',
        }}
      >
        {format === 'SHORT' ? eipShortLabel(eip) : eipLabel(eip)}
      </Link>
    </EipTooltip>
  );
}
