import { autoGenerateWalletDataCollection } from '@/tools/wallet-data-collection/convert-to-feature-data'

import annotations from './rabby.annotations.json'
import browserData from './rabby.browser.capture.json'

const walletDataCollection = autoGenerateWalletDataCollection({
	annotations,
	data: {
		BROWSER: browserData,
	},
	walletId: 'rabby',
})

export default walletDataCollection
