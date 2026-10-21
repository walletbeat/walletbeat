What ecosystem alignment actually looks like for modern wallets?

Wallets should play well within the ecosystem. Here's how Walletbeat evaluate this attribute.

A Walletbeat thread 🧵

![Ecosystem Attribute Group](./ecosystem.png)

---

Account abstraction

Is the wallet Account Abstraction ready?

Wallets are rated based on whether they make use of EIP-7702: Account Abstraction via smart contract authority delegation transactions (for EOA or MPC wallets), or if they support ERC-4337: Account Abstraction for smart contract wallets transactions (for smart contract wallets).

![Account Abstraction](./account_abstraction.png)

---
Why does this matter?

smart wallet accounts offer many UX and security improvements, such as the ability to: batch multiple transactions, pay gas fees in other tokens than Ether, enable the use of Passkeys for signing transactions, update the set of keys used to control the wallet, define account recovery rules, etc. 

---

Address resolution

Can the wallet send funds to human-readable Ethereum addresses?

Ethereum addresses are unreadable to humans. Address naming registries like ENS partially solve this problem.

Some address format standards improve upon this further by including the destination chain information as part of the address itself. Such standards include:
- ERC-7828 Chain-specific addresses using ENS: user@l2chain.eth
- ERC-7831 Multi-chain addresses: user.eth:l2chain

![Address Resolution](./address_resolution.png)

---
Why does this matter?

Ethereum addresses are hexadecimal strings (0x...) which are unreadable to humans. Phishing scams and exploits have used this to trick users into sending funds to invalid addresses.

Additionally, Ethereum's transition to layer 2 chains has changed user needs when sending funds:

The user needs to ensure that they are sending funds to the correct hexadecimal address on the correct chain, increasing the potential for mistakenly sending funds to the wrong place or the wrong chain.

---

Browser integration

Does the wallet comply with web browser integration standards?

![Browser Integration](./browser_integration.png)

---

Why does this matter?

Web applications that want to integrate with Ethereum should not have to write code specific to the wallet that the user has installed. For this reason, the Ethereum community has defined web browser integration standards, which dictate how wallets and web pages can interact with each other.

By ensuring that wallets implement this standard interface, applications automatically support all wallets that implement the interface. This ensures compatibility across wallets, and ensures that the Ethereum wallet ecosystem remains competitive thanks to wallet interoperability.

---

Chain abstraction

Does the wallet smooth out the complexities of dealing with multiple chains?

![Chain Abstraction](./chain_abstraction.png)

---

Why does this matter?

Ethereum activity is not limited to the main L1 chain; a lot of activity has moved onto rollups and Layer 2 chains. This has allowed Ethereum to scale beyond what its L1 chain can handle, but has also introduced complexity and fragmentation for users and wallets to deal with. They must now deal with token balances fragmented across multiple chains.

To address the UX impact of this complexity, wallets should provide features to abstract away these issues, while remaining transparent to the user when cross-chain bridging risks or fees are involved.

---

Transaction batching

Does the wallet support bundling multiple operations as a single transaction?

![Transaction Batching](./transaction_batching.png)

---

Why does this matter?

Transaction batching is one of the longstanding features without which Ethereum user experience (UX) has suffered. One of the most common pain points for DeFi, for example, has been the need to perform separate "token approval" transactions, followed by a separate transaction to actually execute the user's original intent.

---


Hardware wallet interoperability

Does the wallet support directly connecting to hardware wallets from a plurality of manufacturers?

this check is only about hardware wallet interoperability. Wallets are evaluated based on whether they directly integrate with hardware wallets from a plurality of major hardware wallet manufacturers.

A wallet receives a passing rating if it supports hardware wallets from at least 3 major hardware wallet manufacturers:Ledger, Trezor, Keystone, GridPlus, imKey.

---

Why does this matter?

Supporting multiple hardware wallet manufacturers preserves a healthy, open, competitive, interoperable market for hardware wallets.

It also increases the total addressable market of users for the software wallet, as users that already own a specific hardware wallets will want to use a software wallet that supports it.

---

Wallets are how users use and experience Ethereum. Doesn't matter how CROPS-y the protocol layer is: no CROPS in wallets means no CROPS for users.

Ethereum values, like Ecosystem alignment, only matter if users actually experience them.

![CROPS for Users](./crops_for_users.png)

---

Please visit our website to see the current wallet landscape 🌸 

Let's keep pushing CROPS in wallets.

https://beta.walletbeat.eth.limo/about/

![Walletbeat Image](./walletbeat_image.png)