declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The URL root of the website.
     */
    WALLETBEAT_URL_ROOT?: string;

    /**
     * Set when running in dev mode.
     */
    WALLETBEAT_DEV?: string;
  }
}
