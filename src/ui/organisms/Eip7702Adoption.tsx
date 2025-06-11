import type React from 'react';
import { LuGithub } from 'react-icons/lu';

import { repositoryUrl } from '@/constants';

import { ExternalLink } from '../atoms/ExternalLink';
import Eip7702Table from './Eip7702Table';

export function Eip7702Adoption(): React.JSX.Element {
  return (
    <div className='max-w-screen-xl 3xl:max-w-screen-2xl mx-auto w-full'>
      <div className='flex flex-col lg:mt-10 gap-4'>
        <div className='px-8 py-6 flex justify-between items-start flex-wrap relative flex-col md:flex-row'>
          <div className='flex flex-col gap-4 py-8 flex-1'>
            <h1 className='text-4xl font-extrabold text-accent'>EIP-7702 Adoption Tracker</h1>
            <p className='text-secondary'>
              Which wallets implement{' '}
              <ExternalLink
                url='https://eip.tools/eip/7702'
                defaultLabel='EIP-7702'
                style={{
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              ? How compliant and standardized is their implementation? Which new 7702-enabled
              features does each wallet support?
            </p>
            <p className='text-secondary'>
              Inspired by{' '}
              <ExternalLink
                url='https://swiss-knife.xyz/7702beat'
                defaultLabel='7702 Beat'
                style={{
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              , from the great folks at{' '}
              <ExternalLink
                url='https://swiss-knife.xyz'
                defaultLabel='Swiss-Knife.xyz'
                style={{
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              . Also check out{' '}
              <ExternalLink
                url='https://www.bundlebear.com/eip7702-authorized-contracts/all'
                defaultLabel="BundleBear's EIP-7702 contract tracker"
                style={{
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              !
            </p>
          </div>
        </div>
      </div>

      <div className='w-full flex flex-col gap-2 p-4 md:p-8'>
        <Eip7702Table />
      </div>
      <div className='flex gap-2'>
        Incorrect data? Submit a PR:
        <div className='bg-primary border px-2 py-1 rounded-md hover:bg-primary'>
          <div className='flex flex-row gap-2 items-center' key='repo'>
            <LuGithub />
            <ExternalLink
              url={repositoryUrl}
              defaultLabel='GitHub Repository'
              style={{
                fontWeight: 500,
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
