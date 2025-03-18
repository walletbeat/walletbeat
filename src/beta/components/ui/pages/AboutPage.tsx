import { Typography, Divider } from '@mui/material';
import { Box } from '@mui/system';
import type React from 'react';
import { NavigationPageLayout } from './NavigationPageLayout';
import {
  navigationAbout,
  navigationFaq,
  navigationFarcasterChannel,
  navigationHome,
  navigationRepository,
} from '../../navigation';
import { ExternalLink } from '../atoms/ExternalLink';
import { IconLink } from '../atoms/IconLink';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ForumIcon from '@mui/icons-material/Forum';
import GitHubIcon from '@mui/icons-material/GitHub';
import { betaSiteRoot } from '@/beta/constants';

function AboutContents(): React.JSX.Element {
  return (
    <>
      <Typography variant="body1">
        Walletbeat is a public good project that brings transparency to the Ethereum wallet
        ecosystem.
        <br />
        <strong>
          As <ExternalLink url="https://l2beat.com">L2Beat</ExternalLink> has done for Ethereum
          Layer 2s, Walletbeat aims to do the same for Ethereum wallets.
        </strong>
      </Typography>
      <Divider
        orientation="horizontal"
        variant="middle"
        flexItem={true}
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      />
      <Typography variant="body1">
        Walletbeat aims to be fair, objective and impartial in its assessment methodology of
        Ethereum wallets.
        <br />
        Where there is inherent subjectivity, such as in the decision of <em>which</em> criteria are
        used to rate and categorize wallets, Walletbeat aims to follow Ethereum&apos;s ethos and
        cypherpunk values as a guiding principle. See{' '}
        <ExternalLink url="https://vitalik.eth.limo/general/2024/12/03/wallets.html">
          Vitalik&apos;s blog post on wallets
        </ExternalLink>{' '}
        and the{' '}
        <IconLink IconComponent={HelpCenterIcon} href={`${betaSiteRoot}/faq`}>
          Walletbeat FAQ page
        </IconLink>{' '}
        for more details.
      </Typography>
      <Divider
        orientation="horizontal"
        variant="middle"
        flexItem={true}
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      />
      <Typography variant="body1">
        Walletbeat is committed to transparency. It is an{' '}
        <IconLink
          IconComponent={GitHubIcon}
          href="https://github.com/fluidkey/walletbeat"
          target="_blank"
        >
          open-source project
        </IconLink>{' '}
        licensed under the Free and Open-Source MIT license. Discussions are held on the{' '}
        <IconLink
          IconComponent={ForumIcon}
          href="https://warpcast.com/~/channel/walletbeat"
          target="_blank"
        >
          public /walletbeat Farcaster channel
        </IconLink>
        .
      </Typography>
      <Divider
        orientation="horizontal"
        variant="middle"
        flexItem={true}
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      />
      <Typography variant="body1">
        As of 2025-01, Walletbeat has received no funding and is not in need of any.
        <br />
        If funding becomes a necessity in the future, Walletbeat aims to raise funds through
        retroactive funding, ecosystem grants, and individual donations. Walletbeat will then
        publish a funding transparency page that documents the date, origin, and amount of such
        funding.
      </Typography>
      <Divider
        orientation="horizontal"
        variant="middle"
        flexItem={true}
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      />
      <Typography variant="body1">
        Walletbeat refuses and will continue to refuse funding from wallet-related entities.
        <br />
        Walletbeat however was originally created and is currently hosted by{' '}
        <ExternalLink url="https://fluidkey.com/">Fluidkey</ExternalLink>, an incorporated company
        in Switzerland with a wallet offering. In order to maximize credible neutrality,
        Walletbeat&apos;s long-term ownership goal is to become an independent DAO or foundation
        (similar to L2Beat) once Walletbeat reaches a higher level of maturity and a broader set of
        regular contributors. Until this is achieved, Walletbeat will not list nor rate wallet
        software from Fluidkey.
      </Typography>
      <Divider
        orientation="horizontal"
        variant="middle"
        flexItem={true}
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      />
      <Typography variant="body1">
        Wallets listed on Walletbeat do not represent an endorsement and is for informational
        purposes only. If you find that something is wrong, please help Walletbeat by{' '}
        <IconLink
          IconComponent={GitHubIcon}
          href="https://github.com/fluidkey/walletbeat"
          target="_blank"
        >
          contributing
        </IconLink>
        !
      </Typography>
    </>
  );
}

export function AboutPage(): React.JSX.Element {
  return (
    <NavigationPageLayout
      groups={[
        {
          id: 'nav',
          items: [navigationHome],
          overflow: false,
        },
        {
          id: 'about-group',
          items: [
            {
              id: 'about',
              title: navigationAbout.title,
              icon: navigationAbout.icon,
              contentId: 'aboutHeader',
            },
          ],
          overflow: true,
        },
        {
          id: 'rest-of-nav',
          items: [navigationFaq, navigationRepository, navigationFarcasterChannel],
          overflow: false,
        },
      ]}
    >
      <Typography id="aboutHeader" variant="h1" mb={1}>
        About Walletbeat
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontStyle: 'italic', fontSize: '1.25rem', opacity: 0.75 }}
        mb={2}
      >
        Who watches the wallets?
      </Typography>
      <Box maxWidth="75vw" display="flex" flexDirection="column" alignItems="stretch">
        <AboutContents />
      </Box>
    </NavigationPageLayout>
  );
}
