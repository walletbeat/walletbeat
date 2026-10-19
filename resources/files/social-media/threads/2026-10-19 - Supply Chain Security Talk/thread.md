
Wallets are one of the highest-stakes pieces of software in crypto. Yet your wallet probably depends on a few dozen random NPM packages, recursively depending on thousands of others. 

In the face of NPM package compromises, such as the Axios hack earlier this year, how should wallets protect against software supply chain attacks and make their build processes more robust?

![Account Portability](./polymutex_talk.jpg)

---

Software supply chain directly impacts wallets' security, and therefore user funds' security. A compromised dependency in a wallet means a compromised wallet, which means compromised users.

---

Learn about existing measures for software supply chain integrity (Sigstore, SLSA, TUF), their underlying concepts (lockfiles, reproducible builds, hermetic builds, attestations, SBOMs), why they are important, and how to implement these processes in your wallet's software development process.


