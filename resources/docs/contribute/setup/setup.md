---
title: Contributor setup for Walletbeat
description: 'Guide on setting up a development environment for Walletbeat.'
---

# Contributing to Walletbeat

Thanks for your interest in contributing to Walletbeat!

## Development setup & workflow

Before you can contribute wallet data to Walletbeat, you need to make a copy of the site and its data, run it on your computer, make changes, and be able to submit them for review. This involves knowing how to use a terminal, set up Git, clone the repository, set up a TypeScript development environment, and make PRs on GitHub. If you are not familiar with these concepts, read this section; otherwise skip ahead. All the guides below **assume you are already familiar with this**.

### Get started

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/walletbeat/walletbeat
   cd walletbeat
   pnpm install
   ```

2. Run the website locally:

   ```bash
   pnpm dev
   ```

3. Browse the site at `http://localhost:4321/`.

### Verify and sign changes

Run `pnpm fix` to apply formatting and refresh generated files, then run `pnpm check:quick` before each commit. Run `pnpm check:all` when the change is ready. It must pass before completing the task or opening a PR. Investigate failures and resolve them before submission. Some checks refresh tracked outputs such as the image cache. Inspect and include related generated changes.

Use `.cspell.json` for valid spelling exceptions. For changes to grammar rules in `tests/utils/grammar.ts`, fix affected site content in the same change. Install tools such as Inkscape when required by the checks for your change.

CI requires every commit to be signed. Set `commit.gpgsign` to `true` and configure a valid SSH or GPG key. [Configure commit signing](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key).

### Contribution workflow

At a high-level, any type of contribution to Walletbeat goes like this:

- Clone the repository locally and install dependencies (see above).
- Make your desired changes; use `pnpm dev` to preview, `pnpm check:quick` to run tests.
- Follow the [authoring principles](../authoring/authoring.md) and [verification steps](#verify-and-sign-changes).
- Create a fork of the Walletbeat repository under your own GitHub account. You can do this by pressing the "Fork" button on the [Walletbeat GitHub repository page](https://github.com/walletbeat/walletbeat)
- Create a new branch in your local clone of the repository. For example: `git checkout -b my-cool-pr`
- Commit your changes to the branch. For example: `git add -p` (to review your changes), then `git commit -m 'Make cool changes to Walletbeat.'`
- Push your branch to your fork: `git push --set-upstream git@github.com:MyGitHubUsername/walletbeat my-cool-pr`
- Open a Walletbeat PR using the link that the `git push` command has given you.

_Need more help?_: For more help on creating PRs, check out [GitHub's own guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request). For help on using `git` in general, ask your favorite large language model to assist.

After sending a PR, a Walletbeat contributor should soon review your changes. If there are problems (test failures, invalid data, etc.), your PR may need further work. You can update your PR by pushing additional changes to the same branch. Follow this workflow:

- Make the requested changes in your editor.
- Repeat [verification](#verify-and-sign-changes).
- Commit your changes: `git add -p` then `git commit -m 'Some more fixes'`
- Upload your changes to GitHub: `git push`
- Write a comment on the PR to explain your fixes and to notify your reviewer that they need to take another look at your PR.

Once the PR is merged, you are done!

🫡 **Thank you for contributing to Walletbeat and making the wallet ecosystem stronger!** 🫡

## Choose your adventure

### I want to add or update wallet data to the site

Please read [`/resources/docs/contribute/wallet-data/wallet-data.md`](/resources/docs/contribute/wallet-data/wallet-data.md).

### I want to make UI/UX changes

Please read [`/resources/docs/contribute/ui/ui.md`](/resources/docs/contribute/ui/ui.md).

### I want to learn more about Walletbeat

Please read the [About page](/src/pages/about/_about.md).

### I am a coding agent and I am looking for documentation on the codebase's structure

Please read all the guides in `/resources/docs/contribute`, as well as the files in the repository's [`.agents`](/.agents) top-level directory.
