import AtSignIcon from 'lucide-static/icons/at-sign.svg?raw'
import BellIcon from 'lucide-static/icons/bell.svg?raw'
import BookOpenIcon from 'lucide-static/icons/book-open.svg?raw'
import ChartBarIcon from 'lucide-static/icons/chart-bar.svg?raw'
import StairsIcon from 'lucide-static/icons/chart-no-axes-column-increasing.svg?raw'
import ChartPieIcon from 'lucide-static/icons/chart-pie.svg?raw'
import EyeOffIcon from 'lucide-static/icons/eye-off.svg?raw'
import FileCodeIcon from 'lucide-static/icons/file-code.svg?raw'
import GlobeIcon from 'lucide-static/icons/globe.svg?raw'
import HashIcon from 'lucide-static/icons/hash.svg?raw'
import LayersIcon from 'lucide-static/icons/layers.svg?raw'
import LogInIcon from 'lucide-static/icons/log-in.svg?raw'
import PlugIcon from 'lucide-static/icons/plug.svg?raw'
import RadarIcon from 'lucide-static/icons/radar.svg?raw'
import SignatureIcon from 'lucide-static/icons/signature.svg?raw'
import UserCogIcon from 'lucide-static/icons/user-cog.svg?raw'
import WalletIcon from 'lucide-static/icons/wallet.svg?raw'

import type { LucideNavigationIcon } from '@/constants/navigation'
import { FarcasterIcon } from '@/icons/farcaster'
import { XIcon } from '@/icons/x'

/** Raw SVG markup for each Lucide icon usable as a navigation or EIP icon. */
export const lucideNavigationIcons: Record<LucideNavigationIcon, string> = {
	ICON_AT_SIGN: AtSignIcon,
	ICON_BELL: BellIcon,
	ICON_BOOK_OPEN: BookOpenIcon,
	ICON_CHART_BAR: ChartBarIcon,
	ICON_CHART_PIE: ChartPieIcon,
	ICON_EYE_OFF: EyeOffIcon,
	ICON_FARCASTER: FarcasterIcon,
	ICON_FILE_CODE: FileCodeIcon,
	ICON_GLOBE: GlobeIcon,
	ICON_HASH: HashIcon,
	ICON_LAYERS: LayersIcon,
	ICON_LOG_IN: LogInIcon,
	ICON_PLUG: PlugIcon,
	ICON_RADAR: RadarIcon,
	ICON_SIGNATURE: SignatureIcon,
	ICON_STAIRS: StairsIcon,
	ICON_TWITTER: XIcon,
	ICON_USER_COG: UserCogIcon,
	ICON_WALLET: WalletIcon,
}
