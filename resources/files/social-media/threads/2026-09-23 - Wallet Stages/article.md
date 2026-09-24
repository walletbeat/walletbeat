
As a wallet development team, this give you a lot of targets to hit: Where do you start? How do you make progress?

### How do you make sense of it all? This is where the Stage System comes in. 

Walletbeat took inspiration from L2BEAT's Rollup Maturity Framework. We introduce the same Stage Evaluation Framework but for Ethereum Wallets.

## Wallet Stage Definitions
Stages describe the milestones Ethereum wallets should work towards. Each stage builds on the previous, forming a roadmap for wallet teams to follow. We’ve introduced Wallet Stage Definitions to map a wallet's progression toward self-sovereignty

## Stage 0: Verifiable
Users should at least be able to verify the wallets they're using.
- Source Code Availability 🍝
The source code must be publicly available so that it can be reviewed by the public.

![Stage 0](./stage_0.png)

## Stage 0.5: Foundational
Wallets should also implement the foundations of a proper Ethereum wallet. The wallet provides basic security protections for its users. 

- Hardware Wallet Support
Supporting hardware wallets lets users keep their private keys offline, adding a critical layer of security.

- Transaction Legibility 🫆
Users must be able to see key transaction details (amount, recipient, chain, fees) before signing to understand the transaction they are about to do.

- Basic Authentication
Without a lock screen, anyone who picks up a device can immediately access and transfer funds. Basic authentication is the minimum bar for protecting users against physical theft or unauthorized access.

- Basic Account Recovery Assurance
Recovery methods can silently become inaccessible over time, for example a seed phrase becoming unreadable. Periodic check-ups catch this early, rather than leaving users to discover the problem only when they actually need to recover their account. 

![Stage 0.5](./stage_0.png)

## Stage 1: Ethereum Standard
After that, a wallet can now move on to becoming an Ethereum Standard wallet. A wallet that follows ecosystem standards, embraces interoperability, and adopts ecosystem practices.

The wallet provides a basic level of security:

- Security Audits
This provides a level of assurance about the software security practices of the wallet developer.

- Hardware Wallet Interoperability
Hardware wallets keep private keys isolated on dedicated, purpose-built devices, and direct support for multiple manufacturers ensures users are not locked into a single hardware vendor and can freely choose the device that best fits their security needs.

- Scam Alerting 🚨
Wallets should alert users about known scams before transactions are made, helping prevent irreversible losses. Transaction legibility (Stage 0.5) is a prerequisite for meaningful scam alerting.

- Standard Security Practices
Standard security practices, such as storing keys in a secure enclave and requesting minimal permissions, protect users from key extraction attacks and malicious apps. These are baseline implementation requirements for a wallet that takes security seriously.

- Account Recovery 🛟
The wallet must implement guardian-based account recovery that lets users recover their account in all likely catastrophic scenarios, and must periodically prompt users to verify that their account recovery methods are still accessible

The wallet offers a minimal level of privacy to its users:

- Private Transfers
Without private token transfers, the user's Ethereum activity will be publicly and forever stored for the world to see. This would be the equivalent of a financial panopticon.

- Wallet Address Privacy
Your wallet address is unique and permanent, which makes it easy to track your activity. At minimum, wallets must not link your wallet address to personally identifying data such as your name, email, phone number, or account credentials. Linkage to IP address or pseudonyms is tolerated at this stage.

- Multi-Address Privacy 👛
You probably have more than one wallet address configured in your wallet, which you use for different purposes and perhaps as different identities. These wallet addresses all belong to you, but you would rather keep that fact private. It is therefore important to use a wallet that does not reveal that fact.

The wallet does not lock the user in and lets the user remain in full control of their account: 
- Account Unruggability 
- Account Portability 💼
- Support Own Node
- Outstanding Approvals (ERC-20)

The wallet's development process and internal workings are transparent to the user:
- Free and Open Source Licensing 📜
The wallet must be licensed under a Free and Open Source Software (FOSS) license. FOSS licensing allows better collaboration, more transparency into the software development practices that go into the project, and allows security researchers to more easily identify and report security vulnerabilities.

The wallet is aligned with basic Ethereum ecosystem best practices for usability:
- Address Resolution 📧
- Browser Integration 🌐

![Stage 1](./stage_0.png)

## Stage 2: Trust Minimized

## Open questions
### - How do we get wallet teams to care? 
We need wallets to care about what the dashboard says. And that means credibility, community engagement, having outreach, all of those things. So, again, we welcome your support here.

### - How do we know how/when to change the bar? 
If it's too high, too low. We need a feedback mechanism, in case the bar is not being helpful. 

### - How will governance avoid capture?
But it also needs to avoid capture by wallet development teams, who have an incentive to change where the bar is. So, again, a difficult balance to strike.

### - Sustainable funding for wallet research/updates
There needs to be a sustainable development model, which L2BEAT has cracked but Walletbeat is not there yet.

beta.walletbeat.eth.limo/stages
![Wallet Stages](./wallet_stages.png)

There's the site, our GitHub repository, farcaster channel for social conversation and X account for updates. Come contribute with us. We'll be welcoming you 🌸

![Our Socials](./our_socials.png)
