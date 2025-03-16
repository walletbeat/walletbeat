/**
 * A profile for a wallet. This should roughly describe the intended use-cases
 * and audience for a wallet. It is used to determine which features matter
 * for a wallet, and which attributes it may be exempt from because they do
 * not matter for users of this type of wallet.
 */
export enum WalletProfile {
	/**
	 * A browser extension wallet is installed as a browser plugin.
	 * Examples include MetaMask.
	 */
	BROWSER_EXTENSION = 'BROWSER_EXTENSION',

	/**
	 * A web wallet runs in the browser, not as a plugin.
	 * Examples include Rabby and Frame.
	 */
	WEB = 'WEB',

	/**
	 * A mobile wallet is installed as a mobile app.
	 * Examples include Rainbow.
	 */
	MOBILE = 'MOBILE',

	/**
	 * A desktop wallet is installed as a desktop app.
	 * Examples include MyCrypto.
	 */
	DESKTOP = 'DESKTOP',

	/**
	 * A hardware wallet is a physical device that holds private keys.
	 * Examples include Ledger and Trezor.
	 */
	HARDWARE = 'HARDWARE',

	/**
	 * A generic wallet is not of any specific type.
	 */
	GENERIC = 'GENERIC',
}

/**
 * The type of hardware wallet manufacturing.
 */
export enum HardwareWalletManufactureType {
	/**
	 * A factory-made hardware wallet is manufactured by a company
	 * Examples include Ledger, Trezor, GridPlus, and Keystone.
	 */
	FACTORY_MADE = 'FACTORY_MADE',
	
	/**
	 * A DIY hardware wallet is assembled by the user themselves
	 * Examples include self-assembled devices using open source hardware designs.
	 */
	DIY = 'DIY',
}
