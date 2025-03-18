import WalletTable from '@/beta/components/ui/organisms/WalletTable';
import { Box, Typography } from '@mui/material';
import type React from 'react';
import './global.css';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ForumIcon from '@mui/icons-material/Forum';
import FoundationIcon from '@mui/icons-material/Foundation';
import GitHubIcon from '@mui/icons-material/GitHub';
import type { Metadata } from 'next';
import { generateBasicMetadata } from '@/beta/components/metadata';
import { IconLink } from '@/beta/components/ui/atoms/IconLink';
import { betaSiteRoot } from '@/beta/constants';

export function generateMetadata(): Metadata {
  return generateBasicMetadata({
    title: 'Walletbeat',
    route: betaSiteRoot,
  });
}

export default function Page(): React.JSX.Element {
  return (
    <Box maxWidth="100vw" display="flex" flexDirection="column" alignItems="center">
      <Box
        minHeight="100vh"
        maxWidth="100vw"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        px={2}
      >
        <Typography variant="h1" fontWeight={600} mt={1} maxWidth="90vw">
          Walletbeat
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontStyle: 'italic',
            opacity: 0.75,
          }}
          maxWidth="90vw"
        >
          Who watches the wallets?
        </Typography>
        <Typography variant="caption" mt={1} maxWidth="90vw">
          Beta version; work in progress. Get in touch on Farcaster or GitHub if you wish to
          contribute.
        </Typography>
        <Box display="flex" flexDirection="row" alignItems="center" mt={1} mb={1}>
          <Typography component="div" variant="caption">
            <IconLink href={`${betaSiteRoot}/faq`} IconComponent={HelpCenterIcon}>
              Frequently asked questions
            </IconLink>
          </Typography>
          <Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
            |
          </Typography>
          <Typography component="div" variant="caption">
            <IconLink href={`${betaSiteRoot}/about`} IconComponent={FoundationIcon}>
              About Walletbeat
            </IconLink>
          </Typography>
          <Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
            |
          </Typography>
          <Typography component="div" variant="caption">
            <IconLink
              href="https://github.com/fluidkey/walletbeat"
              target="_blank"
              IconComponent={GitHubIcon}
            >
              Contribute on GitHub
            </IconLink>
          </Typography>
          <Typography component="div" minWidth="1.5rem" textAlign="center" variant="caption">
            |
          </Typography>
          <Typography component="div" variant="caption">
            <IconLink
              href="https://warpcast.com/~/channel/walletbeat"
              target="_blank"
              IconComponent={ForumIcon}
            >
              Discuss on Farcaster
            </IconLink>
          </Typography>
        </Box>
        <WalletTable />
      </Box>
    </Box>
  );
}
