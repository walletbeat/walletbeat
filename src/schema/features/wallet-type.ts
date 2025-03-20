/**
 * Defines wallet types for categorization
 */
export enum WalletTypeCategory {
	EOA = 'EOA',
	SMART_WALLET = 'SMART_WALLET',
	HARDWARE_WALLET = 'HARDWARE_WALLET',
}

/**
 * For Smart Wallets, defines the smart account standard
 */
export enum SmartWalletStandard {
	ERC_4337 = 'ERC_4337',
	ERC_7702 = 'ERC_7702',
	OTHER = 'OTHER',
}

/**
 * Full wallet type information
 */
export interface WalletTypeInfo {
	/**
	 * Main category (EOA, Smart Wallet, Hardware Wallet)
	 */
	category: WalletTypeCategory

	/**
	 * For Smart Wallets, specifies the standard
	 */
	smartWalletStandard?: SmartWalletStandard

	/**
	 * Additional details about the wallet type
	 */
	details?: string
}

/**
 * Helper function to create an EOA wallet type
 */
export function createEOAWalletType(details?: string): WalletTypeInfo {
	return {
		category: WalletTypeCategory.EOA,
		details,
	}
}

/**
 * Helper function to create a Smart Wallet type
 */
export function createSmartWalletType(
	standard: SmartWalletStandard,
	details?: string,
): WalletTypeInfo {
	return {
		category: WalletTypeCategory.SMART_WALLET,
		smartWalletStandard: standard,
		details,
	}
}

/**
 * Helper function to create a Hardware Wallet type
 */
export function createHardwareWalletType(details?: string): WalletTypeInfo {
	return {
		category: WalletTypeCategory.HARDWARE_WALLET,
		details,
	}
}
