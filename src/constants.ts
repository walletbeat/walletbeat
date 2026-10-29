/**
 * Root for the /images endpoint.
 */
export const imagesRoot = '/images'

/**
 * Path to the rated wallet JSON export schema under the site root (and under public/).
 * Single source of truth: used in wallet JSON export $schema (with base URL + /) and in tests
 * as the path segment under public/ when loading the schema file.
 */
export const ratedWalletExportSchemaPath = 'schemas/rated-wallet.schema.json'

/**
 * URL to the project repository.
 */
export const repositoryUrl = 'https://github.com/walletbeat/walletbeat'

/**
 * URL to the project's social channel.
 */
export const socialChannel = 'https://farcaster.xyz/~/channel/walletbeat'
