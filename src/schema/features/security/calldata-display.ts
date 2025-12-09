import type { WithRef } from '@/schema/reference'

export interface CallDataDisplaySupport {
	/* Can display the calldata in raw hex format */
	rawHex: boolean

	/* Can the user copy the raw hex code to the clipboard? */
	copyHexToClipboard: boolean

	/* Can display the calldata in some formatted output (e.g. JSON) */
	formatted: boolean
}
export type CallDataDisplayImplementation = WithRef<CallDataDisplaySupport>
