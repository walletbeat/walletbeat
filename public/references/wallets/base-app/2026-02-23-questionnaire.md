---
title: Walletbeat Base Wallet Questionnaire Responses
date: 2026-02-23
---

# Walletbeat Base Wallet Questionnaire Responses

Thanks for taking the time to answer the following questions. For each response please provide a reference URL where relevant.

## General

1. **What type of accounts (e.g. EOA, 7702, 4337, Safe wallet) do you support?**
    1. **If EOA, how are accounts derived? Do you support BIP32, BIP44, and/or BIP39 for key derivation?**
        - EOA + 7702 delegation / 4337, implementation [https://github.com/coinbase/smart-wallet](https://github.com/coinbase/smart-wallet)
    2. **Do you allow private key export, and/or seed phrase export?**
        - Yes, we offer a recovery key feature which allow users to retain full access of their account in the event they lose access to clients / their account's other keys.

2. **Is it possible to configure the L1 and L2 RPC endpoints?**
    - No.
    1. **Can users configure their own chains with custom endpoints?**
        - No.

3. **Do you warn the user about potentially malicious contracts? Does this check rely on an external service about the contract being checked? If so, which one?**
    - Yes. We are partnered with Blockaid.

4. **Do you warn the user about potentially malicious URLs? Does this check rely on an external service about the contract being checked? If so, which one?**
    - Yes.

5. **Do you warn users when sending tokens to addresses they have not sent tokens to before?**
    - No.

6. **Do you support cross-chain bridging?**
    - Yes.

7. **Do you support displaying cross-chain *separate* token balances? (i.e. "what is my USDC balance on Ethereum and what is my USDC balance on Base)?**
    - Yes.

8. **Do you support displaying cross-chain, *same-token balances* (i.e. "what is my USDC balance across all chains")?**
    - Yes.

9. **Do you support displaying single-chain balances (i.e. "what token balances do I have on OP Mainnet")?**
    - Yes.

10. **Do you support resolving ENS addresses when sending tokens?**
    - Yes.

11. **What are your revenue streams and are they publicly disclosed somewhere?**
    - *(no response)*

12. **Do you have a document explaining the type of data you collect from users, if any? (e.g. privacy policy URL)**
    - [https://wallet.coinbase.com/dapp-privacy-policy](https://wallet.coinbase.com/dapp-privacy-policy)

13. **Do you have a bug bounty program?**
    - [https://hackerone.com/coinbase?type=team](https://hackerone.com/coinbase?type=team)

14. **Do you have a page listing your security audits?**
    - Yes where relevant, e.g. [https://github.com/coinbase/smart-wallet/tree/main/audits](https://github.com/coinbase/smart-wallet/tree/main/audits)

15. **Are there any built in account recovery protocols (e.g. social recovery, etc.)?**
    - Yes. We offer a recovery key on our ERC-4337 accounts.

16. **Do you have any SVG-format icon/logos we can use for your profile on our website?**
    - [https://www.base.org/brand/core-identifiers](https://www.base.org/brand/core-identifiers) (the square)

## Software Wallet Only

1. **Do you support light clients?**
    - No

2. **Do you support any interoperability protocols (e.g. RIP 7755, ERC 7683, etc.)?**
    - No

3. **Do you support EIP-1193, EIP-2700, and/or EIP-6963?**
    - Yes.

4. **Where is the wallet's source code and what license is this under?**
    - Implementation, SDK. Both MIT. Rest is closed-source.
    1. **Is the wallet's code split across multiple repositories (e.g. core vs UI), and are all components source-available?**
        - Yes. Smart contracts and SDK (EIP-1193 provider) are open-source. Rest is closed-source.
    2. **Is it possible to build the wallet from source completely locally?**
        - Yes

## Hardware Wallet Only

*(Not applicable — Base App is a software wallet)*

1. **Under what license is the hardware wallet firmware code?**
2. **What secure element does the wallet use, if any?**
