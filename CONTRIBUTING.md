# Contributing to Walletbeat

## ⚙️ Installation

This project is built with [Astro](https://astro.build/).

```bash
# install dependencies
pnpm install

# run the site
pnpm run dev
```

## 💾 Adding data

Contribute data on wallets that haven't been added to walletbeat yet or update existing data.

Simply copy the `unrated.tmpl.ts` file in the `data/[wallet-type]` folder, rename it to `[wallet-name].ts`, and add your wallet data. Then, import it to the `./data/[wallet-type].ts` file, and create a pull request.

- **Hardware wallets**: [data/hardware-wallets](./data/hardware-wallets) folder.
- **Software wallets**: [data/software-wallets](./data/software-wallets) folder.
- **Embedded wallets**: [data/embedded-wallets](./data/embedded-wallets) folder.

You can find the definition of each criterion at [beta.walletbeat.eth](https://beta.walletbeat.eth.limo).

Feel free to also check open issues in [this repo](https://github.com/walletbeat/walletbeat/issues) and contribute to them.

## 🔍 SEO

The site automatically generates a `sitemap.xml` file using the `@astrojs/sitemap` integration. The sitemap will be available at <https://wallet.page/sitemap-index.xml> after building the site.
