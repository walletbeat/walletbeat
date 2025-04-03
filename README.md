# walletbeat 💗

> This is a work in progress visual rework of the walletbeat website. You can view [the new alpha version here](https://wallet.page).
> You can visit the original site at [beta.walletbeat.eth](https://beta.walletbeat.eth.limo).

An open repository of EVM-compatible wallets.

## Special Thanks

A special thank you goes out to [@polymutex](https://github.com/polymutex) & [@fluidkey](https://github.com/fluidkey) for their kickstart & continued support of this project.

## SEO

The site automatically generates a sitemap.xml file using the @astrojs/sitemap integration. The sitemap will be available at `https://wallet.page/sitemap-index.xml` after building the site.

To configure the site URL for sitemap generation, update the `SITE_URL` in the `.env` file or set it as an environment variable.

## Contributing

We welcome and encourage contributions.
Contribute data on wallets that haven't been added to walletbeat yet or update existing data.

Simply create a new file with your wallet data in the [data/wallets](./data/wallets) folder, add it to the [data.ts](./data/data.ts) file, and create a pull request.

You can find the definition of each criterion at [beta.walletbeat.eth](https://beta.walletbeat.eth.limo).

Feel free to also check open issues in [this repo](https://github.com/walletbeat/walletbeat/issues) and contribute to them.
