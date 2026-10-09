import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { Variant } from '@/schema/variants'
import { nonEmptySet } from '@/types/utils/non-empty'

export const erc4527: Eip = {
	friendlyName: 'QR code signing with offline signers',
	formalTitle: 'QR Code transmission protocol for wallets',
	// The protocol is implemented on both ends: by offline signers (hardware
	// wallets) and by the watch-only wallets that talk to them.
	appliesTo: nonEmptySet(Variant.HARDWARE, Variant.MOBILE, Variant.BROWSER, Variant.DESKTOP),
	finalizedDate: null,
	icon: 'ICON_QR_CODE',
	noteMarkdown: `
		ERC-4527 is marked as Stagnant in the ERC repository, but it is used in
		practice by several hardware and software wallets.
	`,
	number: '4527',
	prefix: EipPrefix.ERC,
	status: EipStatus.STAGNANT,
	summaryMarkdown: `
		ERC-4527 defines how watch-only wallets and offline signers exchange data
		through (animated) QR codes. The offline signer shares its extended public
		key and derivation path so the watch-only wallet can track the account. The
		watch-only wallet then sends unsigned transactions or typed data to the
		offline signer as a QR code, and the offline signer returns the signature
		the same way. Payloads use Blockchain Commons' Uniform Resources (UR)
		encoding.
	`,
	whyItMattersMarkdown: `
		Hardware wallets that sign over QR codes never need a USB or Bluetooth
		connection to the computer or phone running the watch-only wallet, which
		reduces their attack surface. The QR payloads can also be decoded
		independently to check what is being signed. A shared format lets any
		compatible software wallet work with any compatible offline signer,
		avoiding vendor lock-in.
	`,
}
