import { generateBasicMetadata } from '@/beta/components/metadata';
import { FrequentlyAskedQuestionsPage } from '@/beta/components/ui/pages/FrequentlyAskedQuestionsPage';
import { betaSiteRoot } from '@/beta/constants';
import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return generateBasicMetadata({
    title: 'Walletbeat FAQ',
    route: `${betaSiteRoot}/faq`,
    keywordsAfter: ['faq'],
  });
}

export default function Page(): React.JSX.Element {
  return <FrequentlyAskedQuestionsPage />;
}
