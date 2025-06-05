import type React from 'react';

import { betaImagesRoot } from '@/constants';
import type { RatedWallet } from '@/schema/wallet';

export function WalletIcon({
  wallet,
  iconSize,
}: {
  wallet: RatedWallet;
  iconSize: number;
}): React.JSX.Element {
  return (
    <div style={{ width: iconSize, height: iconSize, overflow: 'hidden' }} className='flex'>
      <img
        alt={wallet.metadata.displayName}
        width={iconSize}
        height={iconSize}
        src={`${betaImagesRoot}/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
        style={{
          filter: `drop-shadow(0 0 ${iconSize / 6}px rgba(255, 255, 255, 0.1))`,
        }}
      />
    </div>
  );
}
