![Orderflow Transparency](./cover.png)

What happens to your transaction before it hits the chain?

Walletbeat now rates Orderflow transparency.

Does the wallet transparently disclose how it monetizes your transaction data?

---

Before a transaction is included onchain, wallet software may send your transaction data to external services for broadcast, simulation, or orderflow auctioning.

Some wallets do this by default. Users see the onchain result, but often not what happens off-chain beforehand. If so, they should know before they confirm.

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

PASS if every default recipient is documented and checkably unable to exploit pending transactions. PARTIAL if any cannot be checked that way.

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

Why this matters:

You see fees before you confirm. You should see orderflow handling the same way.

A wallet can show a polished approval screen and still auction your transaction data by default without telling you.

---

Hardware wallets are exempt from this attribute.

Embedded wallets are exempt for now while that category is still thin on Walletbeat.

---

Check wallets on Walletbeat:
https://beta.walletbeat.eth.limo/

Wallet teams: if you auction orderflow by default, ship UI disclosure and an orderflow practices page.
