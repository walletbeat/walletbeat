import type { Info } from '@/types/Info';
import { _1inch } from './wallets/1inch';
import { ambire } from './wallets/ambire';
import { aurox } from './wallets/aurox';
import { bitget } from './wallets/bitget';
import { block } from './wallets/block';
import { blocto } from './wallets/blocto';
import { coinbase } from './wallets/coinbase';
import { core } from './wallets/core';
import { den } from './wallets/den';
import { enjin } from './wallets/enjin';
import { enkrypt } from './wallets/enkrypt';
import { exodus } from './wallets/exodus';
import { frame } from './wallets/frame';
import { frontier } from './wallets/frontier';
import { gemwallet } from './wallets/gemwallet';
import { klever } from './wallets/klever';
import { mathwallet } from './wallets/mathwallet';
import { metamask } from './wallets/metamask';
import { ownbit } from './wallets/ownbit';
import { phantom } from './wallets/phantom';
import { pillar } from './wallets/pillar';
import { rabby } from './wallets/rabby';
import { rainbow } from './wallets/rainbow';
import { safe } from './wallets/safe';
import { safepal } from './wallets/safepal';
import { talisman } from './wallets/talisman';
import { timeless } from './wallets/timeless';
import { tokenary } from './wallets/tokenary';
import { tokenpocket } from './wallets/tokenpocket';
import { trustwallet } from './wallets/trustwallet';
import { uniswap } from './wallets/uniswap';
import { unstoppable } from './wallets/unstoppable';
import { welldone } from './wallets/welldone';
import { zerion } from './wallets/zerion';
import { mewportfolio } from './wallets/mewportfolio';
import { mewmobile } from './wallets/mewmobile';

export const wallets: Record<string, Info> = {
  MetaMask: metamask,
  Uniswap: uniswap,
  Coinbase: coinbase,
  Rainbow: rainbow,
  Safe: safe,
  Den: den,
  Zerion: zerion,
  Tokenary: tokenary,
  Ambire: ambire,
  Trust: trustwallet,
  Math: mathwallet,
  Exodus: exodus,
  TokenPocket: tokenpocket,
  Gemwallet: gemwallet,
  Phantom: phantom,
  Aurox: aurox,
  Welldone: welldone,
  Enjin: enjin,
  '1inch': _1inch,
  Frame: frame,
  Safepal: safepal,
  Core: core,
  Klever: klever,
  Bitget: bitget,
  Blocto: blocto,
  BlockWallet: block,
  Frontier: frontier,
  Pillar: pillar,
  Ownbit: ownbit,
  Unstoppable: unstoppable,
  Enkrypt: enkrypt,
  'Timeless X': timeless,
  Rabby: rabby,
  Talisman: talisman,
  'MEW Portfolio': mewportfolio,
  'MEW Mobile': mewmobile,
};
