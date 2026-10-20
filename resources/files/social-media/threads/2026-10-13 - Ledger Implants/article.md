Over the past few days, Ledger has confirmed incidents involving compromised hardware wallets purchased through an authorized reseller, resulting in users losing funds.

Calling these events unfortunate and disappointing would be an understatement.

Here's where we at Walletbeat stand, why we remain optimistic despite these setbacks, and how we believe wallet security can improve moving forward.

It is worth mentioning that Walletbeat has not yet fully covered hardware wallets, as our evaluations have primarily focused on software wallets.

What happened?

On October 9, Ledger announced that it was investigating reports of users in Southeast Asia losing funds after purchasing hardware wallets from CryptoBilis, an authorized Ledger reseller for Malaysia, Indonesia, and Philippines. Findings suggested that an unauthorized hardware implant could capture recovery phrases displayed on the device's screen and potentially transmit them through cellular connectivity. Even if a hardware wallet has strong cryptography, a secure element, and legitimate firmware, it can still be vulnerable if an attacker can physically modify the device to observe sensitive information.

What makes this incident especially concerning is that the affected devices were distributed through an authorized reseller. Users followed a commonly recommended security practice: purchasing from recognized sellers rather than unknown third parties. It did not protect them.

Similar implants were then reported in sealed Ledger devices sold at retail in Europe, and MediaMarkt pulled Ledger devices from its stores and website. Buying from a major retailer and checking the seal did not help either.

This raises important questions about supply-chain security, physical tamper resistance, and the extent to which users can independently verify the integrity of their devices.

Where does Walletbeat stand?

We believe wallet security should not be reduced to individual features, certifications, or marketing claims. Security is a combination of different properties, each addressing different threats and requiring different assumptions.

Open-source firmware, for example, makes it possible for independent researchers to inspect how a wallet operates. Reproducible builds can help establish whether distributed software corresponds to publicly available source code. Hardware security mechanisms can protect private keys against certain forms of extraction or unauthorized access.

But none of these properties, individually, guarantees that a device has not been physically tampered with. A wallet can satisfy one security property while remaining vulnerable in another. This is why we believe it is important to evaluate security properties independently, rather than treating a wallet as simply secure or insecure.

Why we remain optimistic

Despite what happened, we remain optimistic about the future of wallet security.

There were better ways to protect the users affected by this incident. We should also recognize that security is not a solved problem. There will always be new attack vectors, new vulnerabilities, and new challenges as wallets and technology continue to evolve.
The work of independent security researchers, affected users sharing their experiences, and the broader community investigating these incidents is incredibly important. It allows previously overlooked threats to become better understood and gives the ecosystem an opportunity to develop better protections. What matters is how the ecosystem responds to these incidents. Rather than treating incidents like these as reasons to lose confidence in self-custody, we believe they should motivate the ecosystem to improve the tools and protections that make self-custody possible.

Moving forward

In @VitalikButerin's September 2025 article, The Importance of Full-Stack Openness and Verifiability, Vitalik emphasizes the importance of building technology that is not only open-source but also independently verifiable, across both software and hardware.
"No software is secure if you can't be sure that your hardware is actually running that software, and is not leaking data separately on the side."

We should strive toward a future where users don't have to rely solely on trusting manufacturers, authorized resellers, or third-party certifications to know whether their devices are secure. Instead, we should work toward minimizing trust assumptions through greater openness and verifiability, allowing users to independently verify the security properties of their devices.

In practice, this means end-user-verifiable hardware, which requires open specs: schematics, board layouts, and a bill of materials that anyone can compare against the device in their hands. The alternative is a wallet built from off-the-shelf parts with a self-assembly manual, so no reseller ever handles it. Firefly (https://firefly.city/) takes this approach.

Either path would fulfill a future "Hardware integrity assurance" attribute that we plan to add to Walletbeat for hardware wallets.

The goal should not simply be to convince users that their wallets are secure, but to make it increasingly possible for them to independently verify that they are.
While there is still a long way to go, we believe this is a future worth working toward.

We are tracking this incident in Wallet Security News: https://beta.walletbeat.eth.limo/news/
