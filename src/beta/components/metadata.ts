import type { Metadata } from 'next';
import type { Icons } from 'next/dist/lib/metadata/types/metadata-types';
import { betaImagesRoot } from '../constants';

const siteName = 'Walletbeat';
const siteDescription =
  'Walletbeat is an Ethereum wallet rating site. It aims to provide a trustworthy, up-to-date source of information about the state of the Ethereum wallet ecosystem';
const defaultKeywords = ['walletbeat', 'ethereum', 'wallet', 'wallets', 'wallet beat', 'evm'];
const defaultIcons: Icons = {
  icon: [
    {
      url: `${betaImagesRoot}/favicon.ico`,
      sizes: '16x16',
    },
    {
      url: `${betaImagesRoot}/icon.jpg`,
    },
  ],
};
const locale = 'en-US';

export function generateBasicMetadata({
  title,
  route,
  description = undefined,
  icons = undefined,
  keywordsBefore = undefined,
  keywordsAfter = undefined,
}: {
  title: string;
  route: string;
  icons?: Metadata['icons'];
  description?: string;
  keywordsBefore?: string[];
  keywordsAfter?: string[];
}): Metadata {
  return {
    title,
    applicationName: siteName,
    description: description ?? siteDescription,
    keywords: (keywordsBefore ?? []).concat(defaultKeywords).concat(keywordsAfter ?? []),
    icons: icons ?? defaultIcons,
    openGraph: {
      type: 'website',
      determiner: '',
      title,
      description: description ?? siteDescription,
      siteName,
      locale,
    },
  };
}
