import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuKey, LuSearch, LuWallet } from 'react-icons/lu';

import { allRatedWallets } from '@/data/wallets';
import type { RatedWallet } from '@/schema/wallet';
import { WalletType, mapWalletTypes } from '@/schema/wallet-types';
import { isNonEmptyArray, nonEmptyMap, setContains } from '@/types/utils/non-empty';
import { cx } from '@/utils/cx';

import { WalletIcon } from '../atoms/WalletIcon';

export function WalletDropdown({ wallet }: { wallet?: RatedWallet }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);

  // Update width when popover opens
  useEffect(() => {
    if (open && triggerRef.current !== null) {
      setWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const handleSelect = useCallback((walletId: string) => {
    setOpen(false);

    // Use simple navigation instead of router
    window.location.href = `/${walletId}`;
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          className='border px-2 py-1 rounded-md flex items-center justify-between gap-2 bg-backgroundSecondary w-full'
          aria-label='Select wallet'
        >
          <div className='flex items-center gap-2'>
            {wallet !== undefined ? (
              <>
                <WalletIcon wallet={wallet} iconSize={24} />
                <span>{wallet.metadata.displayName}</span>
              </>
            ) : (
              <span className='text-gray-400'>Select a wallet</span>
            )}
          </div>
          <LuChevronDown className={cx('transition-transform', open ? 'rotate-180' : '')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className='bg-background border rounded-md shadow-lg p-1'
          style={{ width: width > 0 ? Math.max(width, 320) : 320 }}
          sideOffset={8}
          align='start'
          onOpenAutoFocus={e => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Command
            className='w-full'
            filter={(value, search) => {
              // Custom filter function to search in wallet name
              if (value.includes(search.toLowerCase())) {
                return 1;
              }

              return 0;
            }}
          >
            <div className='flex items-center border-b px-2'>
              <LuSearch className='text-gray-400 mr-2' />
              <Command.Input
                ref={inputRef}
                value={search}
                onValueChange={setSearch}
                placeholder='Search all wallets...'
                className='flex-1 h-9 bg-transparent outline-none placeholder:text-gray-400'
              />
            </div>

            <Command.List className='max-h-[350px] overflow-auto'>
              {/* Only show section headers when there are matching items */}
              {Object.values(
                mapWalletTypes((walletType: WalletType): React.ReactNode | null => {
                  const searchLower = search.toLowerCase();
                  const results = Object.values(allRatedWallets).filter(
                    wallet =>
                      setContains(wallet.types, walletType) &&
                      (wallet.metadata.id.toLowerCase().includes(searchLower) ||
                        wallet.metadata.displayName.toLowerCase().includes(searchLower)),
                  );

                  if (!isNonEmptyArray(results)) {
                    return null;
                  }

                  const { heading, icon } = (() => {
                    switch (walletType) {
                      case WalletType.SOFTWARE:
                        return {
                          heading: 'Software Wallets',
                          icon: <LuWallet className='ml-2 flex-shrink-0 opacity-40' size={14} />,
                        };
                      case WalletType.HARDWARE:
                        return {
                          heading: 'Hardware Wallets',
                          icon: <LuKey className='ml-2 flex-shrink-0 opacity-40' size={14} />,
                        };
                      case WalletType.EMBEDDED:
                        return { heading: 'Embedded Wallets', icon: null };
                    }
                  })();

                  return (
                    <Command.Group
                      heading={heading}
                      className='text-xs font-medium text-gray-500 uppercase flex flex-col gap-1 px-1'
                    >
                      {nonEmptyMap(results, wallet => (
                        <Command.Item
                          key={wallet.metadata.id}
                          value={wallet.metadata.id}
                          onSelect={handleSelect}
                          className='flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-backgroundSecondary aria-selected:bg-backgroundSecondary'
                        >
                          <span className='flex items-center gap-2 flex-1 min-w-0'>
                            <WalletIcon wallet={wallet} iconSize={20} />
                            <span className='truncate'>{wallet.metadata.displayName}</span>
                          </span>
                          {icon}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                }),
              )}
            </Command.List>
            <Command.Empty>
              <div className='px-2 py-4 text-center text-gray-400'>No wallets found</div>
            </Command.Empty>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
