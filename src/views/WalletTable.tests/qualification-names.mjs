import { ratedSoftwareWallets } from '../../../data/software-wallets.ts'
import { getWalletStageAndLadder } from '../../utils/stage.ts'

const wallets = Object.values(ratedSoftwareWallets)
/** @param {(wallet: (typeof wallets)[number]) => boolean} predicate */
const names = predicate =>
	wallets
		.filter(predicate)
		.map(wallet => wallet.metadata.displayName)
		.toSorted()

process.stdout.write(
	JSON.stringify({
		allNames: names(() => true),
		qualifiedNames: names(wallet => {
			const { stage } = getWalletStageAndLadder(wallet)

			return stage !== null && typeof stage === 'object'
		}),
		unqualifiedNames: names(
			wallet => getWalletStageAndLadder(wallet).stage === 'QUALIFIED_FOR_NO_STAGES',
		),
	}),
)
