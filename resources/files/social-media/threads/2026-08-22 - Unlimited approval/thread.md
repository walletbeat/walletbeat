Quoting: https://x.com/osint_based/status/2087904964236501162

---

$500K USD was stolen from a user through a malicious approval.

At @Walletbeat, we use unlimited token approvals as part of our evaluation framework to test how wallets warn users about potentially dangerous transactions.

But this raises an important question:

If unlimited token approval is the default, why should it be flagged as a scam?
---

Picture this: it’s 2021, and you need to make multiple transactions.

The UX looks like:

Approve token → TX

Approve token → TX

Approve token → TX

Every time you want to use your tokens, you have to approve spending again.
---

Back then, token approvals were a huge UX problem.

Unlimited approvals became the temporary solution.

Instead of approving a specific amount every time, you could approve a contract to spend an unlimited amount of your tokens.

One unlimited approval = Much less friction.
---

But there was a tradeoff.

If you leave an unlimited approval active, that contract can potentially spend your tokens later.

If it gets exploited, compromised, or becomes malicious, those approved tokens could be at risk.

The UX improvement came with a security risk.
---

And there's another risk: we've normalized the approval itself.

Users see “Approve token” and instinctively click Confirm.

After doing this hundreds of times, users stop thinking about what they're actually granting.
---

An unlimited token approval isn't just saying:

“Let this transaction spend my tokens.”

It lets the contract spend your tokens as it sees fit, including long past your intended transaction.

That's a much bigger permission than most users realize.
---

So why are unlimited approvals still the norm?

Because they solved a real UX problem.

Users don't want to approve every transaction.

But we can solve that problem without giving contracts unlimited spending power.

That's where transaction batching comes in.
---

EIP-5792 and EIP-7702 give us a better way.

Approve → Swap can now become a single batched action.

No need for unlimited approvals.
---

The ideal UX becomes:

Approve the exact amount AND swap at the same time, in a single transaction.

No repeated approvals.

No lingering permissions afterward.

That's a much better tradeoff.
---

But there's a coordination problem.

For unlimited approvals to become unnecessary industry-wide:

Both apps and wallets need to support batched transactions.

Both sides need to move.

---

Unfortunately, apps and wallets have a history of waiting for the other side to adopt first.

And that's how adoption stalls.

---
The better question is:

"Why have we accepted unlimited approvals as normal UX for so long?"

Unlimited approvals don't have to be the norm anymore. Let's change that.

---

At @Walletbeat, we're trying to make wallets better at communicating these risks.

The goal isn't more scary warnings.

It's better UX that makes dangerous approvals unnecessary.
