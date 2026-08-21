---
title: 'Walletbeat impact log'
description: "A log of actions that wallets have taken as a result of Walletbeat's actions or existence."
---

- **2025-12**: Walletbeat publishes the L1 Provider Independence Test: https://x.com/walletbeat/status/2002818293741301777
  - 2026-01: Reaction: Ambire fixes its L1 RPC configuration option to be available at wallet setup time: https://x.com/walletbeat/status/2017683277730001010 / https://x.com/Ivshti/status/2017967726782783683
  - 2026-07: Faced with a regression, Ambire commits to an integration test to avoid further regressions: https://x.com/Ivshti/status/2075451993838002660
  - 2026-07: Reaction: MetaMask (quietly) fixes its hard-reliance on a Consensys token metadata service when sending tokens: https://x.com/walletbeat/status/2066296900785942850
- **2026-07**: Walletbeat contributor 0xMattmatt shows how multiple wallets handle a malicious Ethereum transaction that caused a user to lose ~300k USD: https://x.com/0xMattmatt/status/2081106605463289971
  - **Reaction**: Ambire fixes this in their next release: https://x.com/borislavItskovv/status/2081582575790006360
  - **Reaction**: WalletChan fixes this in their next release: https://x.com/walletbeat/status/2082293464071373094
  - **Reaction**: Ambire thanks Walletbeat for bringing this issue to their attention: https://x.com/ambire/status/2082816470560747558
- **2026-07** - Walletbeat contributor 0xMattmatt shows how multiple wallets handle unlimited token approvals that caused a user to lose ~$500K: https://x.com/0xMattmatt/status/2089770628828237918
  - **Reaction**: Ambire pushed an update to flag unlimited token approval for untrusted contracts and also thanked Walletbeat for its work: https://x.com/borislavItskovv/status/2090566092808982840
- **2026-08**: Walletbeat contributor polymutex points out that flagging IPFS gateways such as `.eth.limo` reduces incentives for Ethereum applications to move to IPFS (which would make them more secure and censorship-resistant).
  - **Reaction**: Ambire unflags IPFS gateways: https://x.com/borislavItskovv/status/2090563980549042476 & https://x.com/ambire/status/2090483593407529375
