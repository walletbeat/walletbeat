/**
 * Site root for the /beta endpoint.
 * Useful to maintain a beta-endpoint-only branch with minimal code changes
 * versus the main branch.
 */
export const betaSiteRoot = ''

/**
 * Root for the /images/beta endpoint.
 * Useful to maintain a beta-endpoint-only branch with minimal code changes
 * versus the main branch.
 */
export const betaImagesRoot = '/images'

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
