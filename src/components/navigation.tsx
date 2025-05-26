import ForumIcon from '@mui/icons-material/Forum';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import HomeIcon from '@mui/icons-material/Home';
import { LuBadgeCheck, LuBuilding2, LuGithub } from 'react-icons/lu';

import { betaSiteRoot } from '@/constants';
import type { NavigationLinkItem } from '@/ui/organisms/Navigation';

export const navigationHome: NavigationLinkItem = {
  id: 'wallet-table',
  icon: <HomeIcon />,
  title: 'Walletbeat',
  href: `${betaSiteRoot}/#`,
};

export const navigationFaq: NavigationLinkItem = {
  id: 'faq',
  icon: <HelpCenterIcon />,
  title: 'FAQ',
  href: `${betaSiteRoot}/faq`,
};

export const navigationAbout: NavigationLinkItem = {
  id: 'about',
  icon: <LuBuilding2 />,
  title: 'About Walletbeat',
  href: `${betaSiteRoot}/about`,
};

export const navigationCriteria: NavigationLinkItem = {
  id: 'criteria',
  icon: <LuBadgeCheck />,
  title: 'Evaluation Criteria',
  href: `${betaSiteRoot}/#criteria`,
};

export const navigationRepository: NavigationLinkItem = {
  id: 'code-repository',
  icon: <LuGithub />,
  title: 'Contribute on GitHub',
  href: 'https://github.com/walletbeat/walletbeat',
};

export const navigationFarcasterChannel: NavigationLinkItem = {
  id: 'farcaster-channel',
  icon: <ForumIcon />,
  title: 'Discuss on Farcaster',
  href: 'https://warpcast.com/~/channel/walletbeat',
};

export const scrollPastHeaderPixels = 16;
