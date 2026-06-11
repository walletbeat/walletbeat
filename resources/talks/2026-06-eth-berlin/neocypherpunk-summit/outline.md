# The wallet walkaway test

"Decentralization and security - avoiding points of trust, minimizing censorship vulnerabilities, and minimizing centralized infrastructure dependency. The natural metrics are (i) **the walkaway test: if your team and servers disappear tomorrow, will your application still be usable**, and (ii) the insider attack test: if your team itself tries to attack the system, how much will break, and how much harm could you do?"

- Vitalik Buterin

---

## Wait, aren't wallets already self-custodial anyway?

Obviously they will pass the walkaway test, right?

Intermediaries creep in for convenience... then convenience turns into necessity:

- Coin price feeds
- Integrated swaps
- Integrated bridging
- Chain data provider
- Indexing services (transaction history)
- Backup services
- Web app connection services (WalletConnect)
- Scam alerting databases
- Transaction simulation services
- MEV protection services
- Transaction bundler services
- Private transaction relay services
- Smart wallet guardians
- LLM provider

This, on a convenience-to-necessity spectrum.

---

## How wallets try to meet the walkaway test in practice

They allow swapping out the "chain data provider" service for another. Sometimes that's also used for transaction broadcasting. Yay.

Often breaks wallets in practice.

---

## L1 provider independence test

Disconnect the wallet from everything but the L1 RPC provider.
Then do basic things: Look at your own balance, send tokens. Can you?

## L1 provider independence test: demo

Demo at least two wallets.

---

## Components of a full wallet walkway test

Every component interoperable, with well-developed self-hostable alternatives.

---

## Embedded wallets

What about Privy?

---

"Decentralization and security - avoiding points of trust, minimizing censorship vulnerabilities, and minimizing centralized infrastructure dependency. The natural metrics are (i) the walkaway test: if your team and servers disappear tomorrow, will your application still be usable, and (ii) **the insider attack test: if your team itself tries to attack the system, how much will break, and how much harm could you do?**"

- Vitalik Buterin

---

## Protecting a wallet against itself

Release process transparency.
Open source. Onchain release metadata.
Attributable commits, public 2-person review process.
Staged releases with security council to override (same as L2s' exit window)

## Why is this hard in practice?

- Web services can update instantly with no recourse anyway.
  Recourse:
  - Need components in TEEs with code attestations enforced by the client, to detect unexpected backend upgrades.
  - ... or to not run these in remote services at all.
- The infrastructure for this is incomplete.
  - We don't just need the code repo onchain, we need the whole code collaboration stack to be onchain with e.g. commit attribution, enforceable and provable review policies, staged rollouts. Radicle is not there yet
- More scrutiny, slower code reviews, and slower releases makes the wallet less competitive
  Recourse: Walletbeat acts as counterbalance to these incentives

---

## What should I do as a wallet user?

- Use a wallet that passes the L1 RPC provider independence test
  - Link to Walletbeat
- Use your own node; wallets will only care about this if people ask
- Run a network capture on your wallet to find out all the services it depends on.
  - Link to Walletbeat guides on this.

---

## What should I do as a non-wallet builder?

We need self-hostable or decentralized wallet infrastructure (beyond the node).

- Price feeds via Uniswap as oracle
- Onchain asset icon registries
- More generally: Onchain registries for L2s (ERC-7785)
- Local scam databases (eth-phishing-detect)
- Better indexing APIs for nodes, or local indexers for personal use (something Rotki has been banging on the drum for as well)
- Open Lavatory
- Intermediary-free private transfer protocols
- Intermediary-free guardian recovery protocols (e.g. zkEmail)
- Onchain code forges
