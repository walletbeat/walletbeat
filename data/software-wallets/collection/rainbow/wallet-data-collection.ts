import { autoGenerateWalletDataCollection } from '@/tools/wallet-data-collection/convert-to-feature-data'

import annotations from './rainbow.annotations.json'
import browserData from './rainbow.browser.capture.json'

const walletDataCollection = autoGenerateWalletDataCollection({
	annotations,
	data: {
		BROWSER: browserData,
		MOBILE: null,
	},
	walletId: 'rainbow',
})

export default walletDataCollection
