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
	}
}
