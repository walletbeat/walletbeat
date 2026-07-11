![Orderflow Transparency](./cover.png)

Your transaction data is valuable. How does your wallet monetize it?

Walletbeat now rates Orderflow transparency.

Does the wallet transparently disclose how it monetizes your transaction data?

---

Before a transaction is included onchain, wallet software may send your transaction data to external services for broadcast, simulation, or orderflow auctioning.

Orderflow auctioning is crypto's version of payment for order flow (PFOF): third parties pay for access to your pending transaction before it executes. It's another form of fee-taking — wallets disclose transaction fees before you confirm, and auctioning deserves the same transparency.

---

Not every wallet auctions orderflow. But when one sends pre-inclusion data externally by default, users should understand what happens.

Walletbeat evaluates three cases:

---

Fully local by default.

Wallets that do not send pre-inclusion transaction data to external parties by default: PASS.

No auctioning disclosure required when there is nothing external to disclose.

---

Shares externally, does not auction.

Some wallets send pre-inclusion data externally for broadcast or simulation, but do not auction orderflow.

PASS if every default recipient is documented and verifiably unable to monetize pending transactions. PARTIAL if any recipient cannot be checked that way.

---

Auctions orderflow by default.

These wallets face the full transparency bar. Walletbeat checks three things:

1. UI disclosure prominence
2. A linked orderflow practices page
3. Onchain outcome verifiability

---

1. UI disclosure prominence

On the approval screen, orderflow disclosure should be at least as prominent as fee display.

FAIL examples: no mention at all, or only a brief "MEV protection" line while fees get a full breakdown.

---

2. Orderflow practices page

Auctioning wallets should link to an orderflow practices page from that UI disclosure.

An orderflow practices page is a public page that lists who receives pre-inclusion data and what they do, explains that auctioning is on by default, and documents how users can change defaults (or states that they cannot).

---

3. Onchain verification

Can users verify onchain outcomes?

PASS when the orderflow practices page documents an effective onchain verification method.

PARTIAL when a method is documented but not confirmed to work.

---

Hardware wallets are exempt from this attribute, as they are dependent on a software wallet component to perform auctioning.

Embedded wallets are exempt for now while that category is still thin on Walletbeat.

---

Check wallets on Walletbeat:
https://beta.walletbeat.eth.limo/

Wallet teams: if you auction orderflow by default, ship UI disclosure and an orderflow practices page.
