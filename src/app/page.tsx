import type React from 'react';
import { Box, Button, Link, Typography } from '@mui/material';
import ComparisonTable from '@/components/ui/organisms/Table';
import NextLink from 'next/link';
import MuiLink from '@mui/material/Link';

export default function Home(): React.JSX.Element {
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
        <Typography variant="h1" fontWeight={600} mt={4} maxWidth="90vw">
          ~ walletbeat
        </Typography>
        <Typography variant="h5" mb={4} textAlign="center" fontWeight={300} maxWidth="90vw">
          An open repository of EVM-compatible wallets.
        </Typography>
        <Typography variant="h4" mb={4} textAlign="center" fontWeight={300} maxWidth="90vw">
          Check out our new beta website at <Link href='https://beta.walletbeat.eth.limo/'>beta.walletbeat.eth</Link>.
        </Typography>
        <ComparisonTable />
        <Box my={6} mb={10} mx={1}>
          <NextLink href="https://github.com/fluidkey/walletbeat" target="_blank">
            <Box color="text.primary">
              <Button
                variant="outlined"
                color="inherit"
                sx={{
                  paddingY: '3px',
                  paddingX: '12px',
                  textTransform: 'none',
                }}
              >
                Contribute
              </Button>
            </Box>
          </NextLink>
        </Box>
      </Box>
      <Typography variant="h6" px={2} width="100%" maxWidth="sm">
        Definitions & Methodology
      </Typography>
      <Typography
        variant="body2"
        fontWeight={900}
        color="text.secondary"
        mt={1}
        px={2}
        width="100%"
        maxWidth="sm"
      >
        Disclaimer: in its current state walletbeat is an MVP meant to kickstart transparent
        benchmarking of wallet features. It only covers a small sample of features and may contain
        inaccurate data. A high score does not necessarily mean better performance, it just means
        more available features. Finally, some features should be available but were not working
        while testing (e.g. testnets on Rainbow).
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Wallets
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        The wallets listed are popular wallets compatible with EVM chains. Contribute to the Github
        repo to add more wallets.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Chains
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Seven of the most popular EVM chains were selected to benchmark chain compatibility. Only
        chains that are present in the wallet by default or that can be added without custom
        configuration are considered.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Chain <b>configurability</b>, i.e. the ability to add custom chains, is also benchmarked.
        Finally,
        <b> autoswitch</b> refers to the ability to automatically switch between chains without
        prompting the user.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        ENS
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Mainnet</b>: whether a user is able to send transactions to a standard ENS (e.g.
        user.eth) on mainnet.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Subdomains</b>: whether a user is able to send transactions to an ENS subdomain (e.g.
        hot.user.eth) on mainnet.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Offchain</b>: whether a user is able to send transactions to an ENS with an offchain
        resolver on mainnet.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>L2s</b>: whether a user is able to send transactions to an ENS on an L2 (tested on
        Optimism).
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Custom</b>: whether a user is able to send transactions to an ENS with a custom domain on
        mainnet (e.g. user.cb.id).
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Usernames</b>: whether a user can get a free (offchain) ENS inside the wallet.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Backup
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Cloud Backup</b>: whether a user is able to back up their keys on a personal cloud
        account like Google Drive.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Manual Backup</b>: whether a user can export their private keys manually.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Social Recovery</b>: whether a user can recover their account through a trusted third
        party like a friend.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Security
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Multisig</b>: whether a user can set a threshold of multiple signers required to approve
        a transaction.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>MPC</b>: whether the private key is split and stored as shards.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Key Rotation</b>: whether the user can change the private keys controlling their account.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Scanning</b>: whether the wallet simulates transactions and warns users on suspicious
        transactions.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Limits</b>: whether the user can enable spending limits and timelocks.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Hardware</b>: whether the wallet can be used with hardware wallets (e.g. Ledger).
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Connection
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>WalletConnect</b>: whether the wallet can connect to dapps using WalletConnect.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Injected</b>: whether the wallet can connect to dapps using a provider injected into the
        browser window.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>In-App Browser</b>: whether the wallet can connect to dapps using an in-app browser.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Devices
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Which types of devices and platforms the wallet is compatible with - mobile, browser
        (extension), desktop.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Type
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Type of the underlying account - EOA, 4337, Safe.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Modularity
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Whether the wallet allows for modules and plugins to add new features to the wallet.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        Testnets
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Whether the wallet is compatible with testnets.
      </Typography>
      <Typography variant="body1" mt={3} px={2} width="100%" maxWidth="sm">
        License
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Open Source</b>: any license that is defined as open source by the Open Source
        Initiative.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Source Visible</b>: any license that allows users to view the source code of the wallet.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        <b>Proprietary</b>: any license that does not allow users to view the source code of the
        wallet.
      </Typography>
      <Typography variant="h6" mt={8} px={2} width="100%" maxWidth="sm">
        Why walletbeat?
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} px={2} width="100%" maxWidth="sm">
        Walletbeat is an MVP built out of necessity. There currently isn&apos;t any repository
        transparently listing wallet features. Many features such as full ENS compatibility should
        be standard across all wallets, but unfortunately aren&apos;t yet. Walletbeat aims to change
        this by providing a transparent repository of feature availability, encouraging wallet
        providers to improve their offering.
      </Typography>
      <Typography variant="body2" fontWeight={400} mt={1} mb={8} px={2} width="100%" maxWidth="sm">
        Contribute by adding a wallet or updating existing data with a PR in the project GitHub.
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        my={4}
        px={2}
        width="100%"
        maxWidth="sm"
        textAlign="center"
      >
        an open source project instigated by{' '}
        <MuiLink
          component={NextLink}
          underline="hover"
          color="text.primary"
          sx={{
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.main',
            },
          }}
          href="https://fluidkey.com"
          target="_blank"
        >
          Fluidkey
        </MuiLink>{' '}
        <br /> reach out at{' '}
        <MuiLink
          component={NextLink}
          underline="hover"
          color="text.primary"
          sx={{
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.main',
            },
          }}
          href="mailto:hey@fluidkey.com"
          target="_blank"
        >
          hey@fluidkey.com
        </MuiLink>
      </Typography>
    </Box>
  );
}
