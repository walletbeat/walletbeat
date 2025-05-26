/**
 * A profile for a wallet. This should roughly describe the intended use-cases
 * and audience for a wallet. It is used to determine which features matter
 * for a wallet, and which attributes it may be exempt from because they do
 * not matter for users of this type of wallet.
 *
 * A profile is **not** something like "web browser wallet" or
 * "mobile wallet"; those are "variants". A single wallet may have
 * multiple variants, i.e. it can have a desktop version, a mobile
 * version, a browser version, and so on.
 *
 * A profile is about the intended audience of the wallet, not about
 * the platform it runs on.
 */
export enum WalletProfile {
  /**
   * A generic wallet is not of any specific type.
   */
  GENERIC = 'GENERIC',

  /**
   * A payments-focused wallet. Focused on sending and receiving money.
   * Not arbitrary transactions.
   */
  PAYMENTS = 'PAYMENTS',
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

/**
 * Interface for a hardware wallet model/device
 */
export interface HardwareWalletModel {
  /**
   * Unique identifier for this model
   */
  id: string;

  /**
   * Display name of the hardware wallet model
   */
  name: string;

  /**
   * URL to the product page
   */
  url: string;

  /**
   * Whether this model is the flagship product
   * The flagship will be displayed by default when viewing wallet details
   */
  isFlagship: boolean;
}
