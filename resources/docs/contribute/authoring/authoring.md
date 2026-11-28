---
title: Walletbeat authoring principles
---

# Walletbeat authoring principles

Apply these principles to every change, from design through review. A review may cover only part of a change. Authors still verify the full change against these principles.

## Irreducibility and proximity

Build from the smallest set of mechanisms that preserves the required behavior. Give each independent fact one owner and derive its dependent values. Check the actual callers and rendered output before removing a distinction.

Reuse existing helpers, libraries, and tooling across application code, tests, and scripts. In the UI, look first at native elements and their [global defaults](/src/styles/global.css), [CSS attributes](/src/styles/css-attributes.css), and [shared components](/src/components). Compose and configure existing primitives before adding one. A new primitive must provide reusable behavior that those primitives cannot express. Name it for that behavior so other callers can use it.

Keep one-off values and overrides at their use, such as in a view's local style block. Put shared behavior at its closest common owner. Express behavior declaratively wherever possible. Each extra identifier, pattern, file, or generated artifact should serve a required purpose. When replacing a mechanism, update its callers and remove the displaced code. Add a compatibility path only for a demonstrated requirement.

## Dependencies and progressive enhancement

Start with native HTML and CSS. Keep content and native controls usable before hydration and with JavaScript disabled. When the environment cannot provide the interaction natively, add a self-contained enhancement. Detect the capability the enhancement needs and preserve the usable baseline when it is absent.

Consider all credible alternatives, including composing existing primitives, using a native feature, and adding a dependency where justified. Compare required functionality, performance, resource use, and maintenance together. A win on one metric cannot excuse a regression in required behavior. Verify platform choices with current [Mozilla's web documentation](https://developer.mozilla.org/) and [Chromium's Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance).

For changes to the build or publishing stack, consider whether someone could still build, serve, and verify the site if a maintainer or service went away. Keep recovery paths usable.

## Comments, tests, and verification

Explain enduring reasons that a future reader cannot readily infer from the code. Put change history in the commit or PR. Keep wallet data explanations in the relevant source reference where possible. See the [wallet data comment guidance](https://github.com/walletbeat/walletbeat/blob/master/.agents/skills/wallet-update/SKILL.md#comments-guidance) for the rare exceptions.

Verify each claim where it can be observed. Use types for structural guarantees, inspect generated output for build contracts, and exercise real browser interactions for behavior and performance.

Write tests that protect a class of failures through its actual contract. For example, check grammar across generated Markdown. A test for punctuation at the end of a single generator's output risks overfitting. Use narrow probes during diagnosis and keep the tests that establish a durable requirement. Keep page-specific tests close to the page code they exercise.

## Apply the relevant project rules

- [Contributor verification and signing](/resources/docs/contribute/setup/setup.md#verify-and-sign-changes)
- [TypeScript and lint rules](/.agents/rules/20-typescript.mdc) and [naming conventions](/.agents/rules/10-naming.mdc)
- [Explicit wallet data encoding](/resources/docs/contribute/wallet-data/wallet-data.md#how-data-fields-are-encoded) and [wallet schema rules](/.agents/rules/50-wallet-schema.mdc), including [nullable feature blobs](https://github.com/walletbeat/walletbeat/blob/master/.agents/rules/50-wallet-schema.mdc#nullable-feature-blobs-partial-research)
- [CSS attribute authoring](https://walletbeat.eth.limo/docs/css-attribute-authoring/)
