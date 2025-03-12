/**
 * A profile for a wallet. This should roughly describe the intended use-cases
 * and audience for a wallet. It is used to determine which features matter
 * for a wallet, and which attributes it may be exempt from because they do
 * not matter for users of this type of wallet.
 */
export enum WalletProfile {
	/**
	 * A generic, one-size fits all wallet that aims to fulfill the needs of
	 * all regular Ethereum users.
	 */
	GENERIC = 'GENERIC',

	/**
	 * A wallet that focuses on peer-to-peer payments only.
	 * Such wallets are exempt from features such as browser integration
	 * standards, because they do not aim to integrate in browsers to begin
	 * with.
	 */
	PAYMENTS = 'PAYMENTS',
	
	/**
	 * A hardware wallet that stores private keys in a secure hardware element.
	 * Such wallets are exempt from features such as hardware wallet support
	 * since they are themselves hardware wallets.
	 */
	HARDWARE = 'HARDWARE',
}
