# Websites that outlast us: dependency minimalism and the walkaway test applied to the frontend stack

- **Session title**: Websites that outlast us: dependency minimalism and the walkaway test applied to the frontend stack
- **Session type**: Talk (20 minutes + 5 minutes for Q&A)
- **Track**: Open & Verifiable Stack
- **Abstract**:
  _Keep it to 1–2 sentences: what the talk is about and what people will walk away with. Please write between 100 and 500 characters._
  Walletbeat asks wallets to embody Ethereum values, so its maintainers turned the same scrutiny on the website that publishes its ratings. In a world of ossified consensus around "good enough" frontend stacks, what tradeoffs are still worth making? Using the site's static build pipeline as a case study, Darryl shows how principles of dependency minimalism and the walkaway test can help devs intentionally build resiliency, transparency, and durability into web development and publishing workflows.

- **Description**:
  _A clear and detailed description helps the review team assess how well your proposal fits the Devcon agenda and directly affects your chances of acceptance. Focus on what knowledge, insight, or findings you're sharing and why it's relevant now. Submissions that are vague, read as a project pitch, or cover ground that has been widely presented before are less likely to be accepted. Please write between 300 and 1000 characters._
  Walletbeat’s stack decisions treat browser-native behavior as a transfer of responsibility: shift implementation away from frameworks toward shared platform primitives, and accept progressive enhancement as an interim tradeoff for newer capabilities. Compilers sidestep the traditional server-client runtime model: Svelte bridges missing state, Astro produces static files, and subresource integrity ensures output is self-consistent.

  Publication is designed around recovery: reject wallet-controlled services whose email recovery restores unilateral control, build once, then send artifacts through independent storage paths and checked browser access before updating ENS. IPFS content addresses are recovery targets, not promises of retention; ENS keeps automated updates revocable without granting ownership of the name. Conventional static hosts (Vercel, Cloudflare) remain the baseline; extra machinery earns its place only when it adds a verifiable or recoverable property the project values.

- **Additional speaker**: N/A
- **Tags**: Decentralization, UX, Open Source, Censorship Resistance

- **This session assumes**: Some familiarity with the topic
- **Target audience**: Developers
- **How does your session relate to CROPS?**
  _Devcon 8 prioritizes sessions that strengthen CROPS: censorship and capture resistance, open source, privacy, and security. Alignment with these properties is a decisive criterion in the selection process._
  The session makes CROPS properties inspectable at the website boundary. An open-source static release can be copied and examined; a known content address lets a verifying client detect substituted output; shared name ownership and revocable record updates limit unilateral control of canonical naming. Storage and browser gateways retain availability power. This gives developers a concrete account of which censorship, capture-resistance and integrity properties the deployment strengthens, and which still depend on operators.
