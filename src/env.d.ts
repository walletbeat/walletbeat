declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * The URL root of the website.
		 */
		WALLETBEAT_URL_ROOT?: string

		/**
		 * Set when running in dev mode.
		 */
		WALLETBEAT_DEV?: string

		/**
		 * Set to 'true' when running as part of precommit hook.
		 * Skips some slow checks.
		 */
		WALLETBEAT_PRECOMMIT_FAST?: string

		/**
		 * Set to "CI" in CI, can take other values in other contexts.
		 */
		WALLETBEAT_ENV?: string

		/**
		 * Wallet ID passed via the `--id` flag to the `agent` subcommand.
		 */
		WALLETBEAT_WALLET_DATA_COLLECTION_ID?: string

		/**
		 * Wallet variant passed via the `--variant` flag to the `agent` subcommand.
		 */
		WALLETBEAT_WALLET_DATA_COLLECTION_VARIANT?: string

		/**
		 * Wallet type passed via the `--type` flag to the `agent` subcommand.
		 */
		WALLETBEAT_WALLET_DATA_COLLECTION_TYPE?: string

		/**
		 * Comma-separated set of repo-root-relative capture file paths the `agent`
		 * harness is allowed to edit, derived from the `--id`/`--variant`/`--type` flags.
		 */
		WALLETBEAT_WALLET_DATA_COLLECTION_ALLOWED_EDIT_FILES?: string
	}
}
