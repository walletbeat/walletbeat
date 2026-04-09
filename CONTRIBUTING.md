# Contributing to Walletbeat

Thanks for your interest in contributing to Walletbeat!

## Development setup & workflow

Before you can contribute wallet data to Walletbeat, you need to make a copy of the site and its data, run it on your computer, make changes, and be able to submit them for review. This involves knowing how to use a terminal, set up Git, clone the repository, set up a TypeScript development environment, and make PRs on GitHub. If you are not familiar with these concepts, read this section; otherwise skip ahead. All the guides below **assume you are already familiar with this**.

### Get started

```bash
# Clone the repository and install dependencies:
$ git clone https://github.com/walletbeat/walletbeat
$ cd walletbeat
$ pnpm install

# Run the website locally:
$ pnpm dev
# [...]
 astro  v5.15.2 ready in 1655 ms
┃ Local    http://localhost:4321/

# Run tests
$ pnpm check:quick # Quick tests only
$ pnpm check:all   # All CI tests
$ pnpm fix         # Automatically fix formatting problems
```

If you are not familiar with using a terminal, `git`, `pnpm`, or TypeScript development in general, ask your friendly neighborhood LLM to help you out; these can be very helpful in helping you set up the required dependencies.

### Contribution workflow

At a high-level, any type of contribution to Walletbeat goes like this:

- Clone the repository locally and install dependencies (see above).
- Make your desired changes; use `pnpm dev` to preview, `pnpm check:quick` to run tests.
- Once done, verify that your work is complete and passes tests by running `pnpm check:all`. If it does not, fix that first.
- Create a fork of the Walletbeat repository under your own GitHub account. You can do this by pressing the "Fork" button on the [Walletbeat GitHub repository page](https://github.com/walletbeat/walletbeat)
- Create a new branch in your local clone of the repository. For example: `git checkout -b my-cool-pr`
- Commit your changes to the branch. For example: `git add -p` (to review your changes), then `git commit -m 'Make cool changes to Walletbeat.'`
- Push your branch to your fork: `git push --set-upstream git@github.com:MyGitHubUsername/walletbeat my-cool-pr`
- Open a Walletbeat PR using the link that the `git push` command has given you.

_Need more help?_: For more help on creating PRs, check out [GitHub's own guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request). For help on using `git` in general, ask your favorite large language model to assist.

After sending a PR, a Walletbeat contributor should soon review your changes. If there are problems (test failures, invalid data, etc.), your PR may need further work. You can update your PR by pushing additional changes to the same branch. Follow this workflow:

- Make the requested changes in your editor.
- Re-run all tests: `pnpm check:all`. If they do not pass, fix that first.
- Commit your changes: `git add -p` then `git commit -m 'Some more fixes'`
- Upload your changes to GitHub: `git push`
- Write a comment on the PR to explain your fixes and to notify your reviewer that they need to take another look at your PR.

Once the PR is merged, you are done!

🫡 **Thank you for contributing to Walletbeat and making the wallet ecosystem stronger!** 🫡

## Choose your adventure

### I want to add or update wallet data to the site

Please read [`/resources/docs/contribute/wallet-data.md`](/resources/docs/contribute/wallet-data.md).

### I want to make UI/UX changes

Please read [`/resources/docs/contribute/ui.md`](/resources/docs/contribute/ui.md).

### I want to understand or change the wallet rating methodology

Please read [`/resources/docs/contribute/methodology.md`](/resources/docs/contribute/methodology.md).

### I want to learn more about Walletbeat

Please read the top-level [`README.md`](/README.md).

### I am a coding agent and I am looking for documentation on the codebase's structure

Please read all of the guides in `/resources/docs/contribute`, as well as the files in the repository's [`.cursor`](/.cursor) top-level directory.
