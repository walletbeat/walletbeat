# The road to decentralized hosting

Prior to launch, Walletbeat is looking for decentralized hosting solutions.

## But why?

Decentralized hosting, relative to traditional web hosting, usually comes with:

- **Higher resilience**: Because the site data lives across many geographical locations, it is more difficult to knock the site offline, whether by accident or on purpose.
- **Censorship resistance**: Because the site data is propagated across entities and jurisdictions, it is more difficult to prevent access to the site.
- **Verifiability**: Because the site data is replicated across untrusted entities, clients requesting site data need a way to certify that the data they are retrieving are legitimate. This is typically provided through the use of [**Content Addressing**](https://en.wikipedia.org/wiki/Content-addressable_storage), i.e. by having the address of the site contain sufficient information to verify the integrity of the data. In addition, solutions like ENS allow the expression of verifiable mappings from human-readable names to content hashes, allowing content-addressed site to be referred to by human-readable names.

These all sound great. But **why does Walletbeat need this?** Walletbeat isn't security-critical. It doesn't require a wallet to be connected, other than perhaps to receive donations down the line. It doesn't even store user data. It is a purely informational site. There is an argument that a site like Walletbeat **shouldn't bother** with decentralized hosting, because it doesn't have the resilience or security needs.

**That is certainly what a web2 startup would conclude. Walletbeat is not a web2 startup.**

Walletbeat's fundamental goal is to push the Ethereum ecosystem forward. Part of that ethos requires a **commitment to crypto values**, which decentralized hosting embodies.

Yet today, most Ethereum applications rely on web2 infrastructure and traditional hosting solutions to survive. This reliance [has infamously **cost the industry over a billion dollars**](https://blog.ipfs.tech/2025-could-ipfs-prevent-bybit-hack/). Clearly there is need to make progress on the adoption of decentralized hosting solutions.

Wait! That sounds a lot like Walletbeat's mission statement, only about web hosting rather than wallets. The ethos behind this sentiment is the same. **If Walletbeat — an entity with a commitment to crypto values and with the goal to push these values out to others — doesn't bother with this, why should any other site be expected to?**

So while Walletbeat itself doesn't _strictly_ need the properties provided by decentralized hosting solution on a technical aspect, the act of relying on traditional hosting would send a clear message of hypocrisy and lack of commitment to crypto values. In turn, **this message would weaken Walletbeat's actual message to the wallet ecosystem**.

**This is why Walletbeat needs walk the walk.**

"But wait! Users will use centralized gateways to access them anyway. So you won't get any of the nice properties you claim to want.", one might object.

This is true in the present, but this is a chicken-and-egg problem. Browsers currently have no incentive to support decentralized hosting solutions, because so few websites use them. We have to start _somewhere_ to break this chicken-and-egg cycle. That might as well be Walletbeat, which has every reason to want this status quo to change.

Yes, this is harder to maintain than traditional hosting solution. Yet it is worth the pain, because doing so is **_mission-critical_**.

## What should Walletbeat look for?

The above is a great philosophical pep talk, but what should Walletbeat do in the real world today? Browsers still don't support many decentralized hosting solutions and rely on trusted HTTP gateways. Users don't know or care about the difference. This is the reality we have to work within. We want Walletbeat data to be easily accessible as far and wide as possible, so we need to find a practical compromise between idealism and practicality.

What problems do we need to solve?

- **Hosting**: Site content needs to be stored somewhere.
- **Naming**: A human-readable name needs to be able to point to the site content.
- **Updates**: The above naming scheme needs to be updatable as site content changes.
- **Access**: Site content needs to be accessible by standard web browsers.
- **Maintenance**: Regular site updates should be continuous and as low-effort as possible to let humans focus on content rather than maintenance.
- **Payments**: Walletbeat needs to be able to pay the hosting provider to ensure its reliable and sustainable service.

Here's what to look for while trying to come up with solutions to solve these problems:

- **Decentralized control**: Control for the hosting infrastructure needs to be eventually splittable across Walletbeat contributors. While a hosting provider may be delegated the unilateral authority to update the site's content, it should be possible for the Walletbeat contributors to take back control at any time in the event that the hosting provider becomes compromised.
- **Accessibility**: Can all web users access the site at all, without additional software or extensions? And if they do, is the URL readable/easy to share?
- **Centralization minimization**: What are the non-decentralized infrastructure components being relied upon? Which entities are a trusted part of this solution, and what is the worst thing they could do if they became compromised?
- **Verifiability**: Is the site's content integrity verifiable?
- **Path to full decentralization**: How long and how realistic is the path to fully achieving hosting decentralization?

Note that the above list is not prescriptive of any particular technology. It is only looking at the outcomes of this technology choice.

So with all this in mind, let us review the technology choices we have at our disposal and see what we can come up with.

## Technological bits

A few definitions and notes on the relevant technologies available today.

- [**IPFS**](https://ipfs.tech) is by far the most widespread [content-addressed storage](https://en.wikipedia.org/wiki/Content-addressable_storage) network. It has been around for a while, and has _some_ browser integration within the Brave and Opera browsers. That said, most web users today access IPFS through centralized HTTP gateways.
- [**DNS**](https://en.wikipedia.org/wiki/Domain_Name_System) (Domain Name System) is the system that stores the names and IP addresses of traditional websites. Control over DNS names cannot be securely split between multiple parties, something which has [led to DeFi frontend compromises](https://x.com/CurveFinance/status/1922199907269501130), making **DNS a non-starter for Walletbeat**. However, details of DNS records are still relevant in the context of gateways which have their own DNS records, as described below.
- [**ENS**](https://ens.domains) (Ethereum Name Service) is a decentralized domain name system. Domains are registered on the Ethereum blockchain. Domain name data may be stored onchain, or can be configured to point to an offchain resolver service. This data can point to an address such as an IPFS or IPNS address. Users can verify the integrity of onchain ENS data using an Ethereum light client, though no web browser supports this at the moment.
- [**IPNS**](https://specs.ipfs.tech/ipns/ipns-record/): IPFS provides content-addressed storage only. IPNS is a naming layer on top that allows _some_ layer of indirection, but introduces a layer of key management that lacks the properties that blockchain naming systems would provide: compatibility with multisigs (critical for Walletbeat governance), censorship resistance, and an immutable audit trail of changes.
- [**IPCM**](https://ipcm.dev/) is an Ethereum smart contract interface [introduced by Pinata](https://www.pinata.cloud/blog/ipcm-solving-dynamic-ipfs-content-with-blockchain-smart-contracts/) as an [alternative to IPNS](https://pinata.cloud/blog/ipcm-vs-ipns/). It stores an IPFS content hash in an updatable smart contract. This smart contract can be queried by an ENS resolver.
- [**ERC-5219**](https://eips.ethereum.org/EIPS/eip-5219) (Contract Resource Requests): A standardized contract interface for onchain HTTP servers, which allows referring to IPFS content hashes. This is very similar in concept to IPCM, but additionally supports non-IPFS and dynamic content.
- **Safe multisig**: An Ethereum account controlled by `N ≥ 2` entities, for which signing authority typically requires a `k`-of-`N` consensus (with `1 ≤ k ≤ N`). Since Walletbeat aims to decentralize to be controlled by multiple contributors, payments and control over web hosting need to be doable from a multisig wallet, and must not require identifiers over which authority cannot be split across entities (such as email addresses or phone numbers). It is OK if a provider _asks_ for one, so long as it does not unilaterally grant the person owning this identifier the ability to control the account.
- [**Gateways**](<https://en.wikipedia.org/wiki/Gateway_(telecommunications)>): Trusted, typically-centralized infrastructure that act as proxies between traditional web browsers and decentralized hosting solutions. These are an inevitable compromise due to the aforementioned lack of native browser support for content-addressed storage protocols. These gateway servers receive web (HTTP) requests, fetch the content from the decentralized hosting solution, and serve it to the user's web browser. Whether any of the beneficial properties of decentralized hosting are passed down to the user varies depending on the gateway's design.
- [**DNSLink**](https://docs.ipfs.tech/concepts/dnslink/): A standard to encode IPFS content hashes in DNS (non-ENS) domain name records. This allows users browsing DNS names to verify the integrity of the data they are accessing for a given DNS domain. Importantly, **it is possible for gateways to populate such records**. While DNSLink relies on the integrity in DNS records and is therefore not a fully-trustless solution for website integrity, it still meaningfully reduces the feasibility of website compromise by requiring simultaneous compromise of the web host and DNS records.
- [**Subresource Integrity**](https://en.wikipedia.org/wiki/Subresource_Integrity) (SRI): Content hashes embedded in web page data itself. This allows an immutable webpage to refer to external resources (JavaScript code, CSS files, images, etc.) and ensures _their_ integrity. Therefore, if a webpage's integrity can be asserted by a user, the use of SRI by that webpage **extends its immutability and verifiability benefits** down to the external resources it depends on. SRI is supported by all modern web browsers.

Because Walletbeat must feature decentralized control, an ENS domain name is a natural choice as the solution to the naming problem, with the ENS name under the control of a multisig. While a hosting provider may be delegated the ability to update the ENS name records when the site is updated (to make everyday content updates easy), the Walletbeat multisig must be able to revoke this authority and take back control of this at any time, in order to avoid the possibility that a compromised hosting provider takes over the site.

ENS supports this through the use of the ["manager" feature](https://support.ens.domains/en/articles/7902188-managing-a-name). This feature allows selective delegation of the ability to update ENS _records_, but not _ownership changes_, to a different wallet address. This means we can set up the ENS name in such a way that the name itself is owned by a multisig, but record updating can be done separately, either by a different multisig (with possibly looser requirements) or by the hosting provider directly.

Putting all of these pieces together, the combination of IPFS and ENS allows the creation of a _multisig-owned_ ENS name with _delegatable record-updating authority_. The ENS records can point to an IPFS content hash, and are updated onchain in an auditable way. If the entity updating ENS records becomes compromised, the ENS-owning multisig can revoke this record-updating authority, then manually override the record to a previous IPFS content hash. The contents of a given IPFS site itself (as addressed by content hash) can't change, due to the verifiability and immutability properties of IPFS.

## Contenders

Now let's look at the solutions out there. _This list is in no particular order._

### Vercel

Vercel is a popular web2 hosting platform for Next.js applications. While it has served its purpose well so far, it is a pure web2 hosting solution, and not appropriate for Walletbeat.

#### Vercel scorecard

- **Hosting**: ❌ Centralized
- **Naming**: ❌ DNS-only
- **Updates**: ❌ Centralized
- **Access**: ✅ Standard website
- **Maintenance**: ✨ Extremely easy, this is basically Vercel's selling point
- **Payments**: ❌ Does not accept crypto payments
- **Special mentions**: _None_

### Fleek

[Fleek](https://fleek.co/) supports ENS domains. ENS content hash updates are supported, but only via IPNS. This makes CI/CD integration easy, but suffers from IPNS's limitations.

Fleek provides hosted IPFS gateways under a custom DNS name or a Fleek-account-controlled subdomain.

While [Fleek](https://fleek.co/) supports wallet-based sign up, Fleek accounts must have an **attached email address** which can be used to log in without access to the wallet keys. This means control over the email address grants control over the Fleek account, and thus cannot be securely split across multiple people. This means the Fleek-provided gateway URL cannot be the canonical URL of the site, as any compromise of either the Fleek account or of the email address that controls it would be enough to permanently take over the site URL.

Fleek supports KYC-free crypto payments via Stripe, making it possible for a multisig wallet to fund a Fleek account.

_Note: Fleek used to feature a free hosting tier which Walletbeat used for a while. It was selected because it was easy to get the site off the ground. The [Fleek free hosting tier has since been discounted](https://fleek.co/pricing/), and Walletbeat no longer uses it._

#### Fleek scorecard

- **Hosting**: ✅ IPFS hosting
- **Naming**: ✅ ENS
- **Updates**: 🙁 Automated IPNS updates
- **Access**: 🚧 Requires non-Fleek IPFS gateway
  - **How can Fleek fix this**: Implement wallet-controlled accounts
- **Maintenance**: ✅ One-time CI/CD integration work
- **Payments**: ✅ KYC-free crypto payments
- **Special mentions**: _None_

### Orbiter

[Orbiter](https://orbiter.host/) is an [open-source (GPL-licensed)](https://github.com/orbiterhost/orbiter-backend) hosting solution. Site data is uploaded to IPFS, and an Ethereum smart contract implementing the [IPCM interface](https://ipcm.dev/) is updated to point to the IPFS content hash.

Orbiter supports wallet-based sign up, but Orbiter accounts still need to have an **attached email address** which can be used to log in without access to the wallet keys. This means control over the email address grants control over the Orbiter account, and thus cannot be securely split across multiple people. This doesn't entirely rule out Orbiter, but does mean that additional mitigations need to be in place to account for the case where the Orbiter account is compromised. Specifically, this means we cannot rely on the Orbiter gateway (`*.orbiter.website`), as any compromise of either the Orbiter account or of the email address that controls it would be enough to permanently take over the site URL.

Orbiter supports KYC-free crypto payments via [LoopCrypto](https://loopcrypto.xyz/), making it possible for a multisig wallet to fund an Orbiter account.

Orbiter relies by default on its own offchain resolver at `api.orbiter.host` for IPCM lookups. The multisig owning the ENS name can still override the ENS resolver record away from Orbiter in case of an Orbiter compromise, so the domain remains unruggable. However, this still means that in the non-compromise case, Orbiter is in a position to collect analytics about who is visiting the website based on queries to its resolver, even when browsing sites using a non-Orbiter IPFS gateway. This is not a huge deal for a non-sensitive, non-personalized website such as Walletbeat, but may be a dealbreaker for more sensitive websites.

Orbiter's gateway [returns IPFS CIDs in its HTTP responses](https://warpcast.com/polluterofminds/0x8ed7e33a). This is a cool feature, but browsers currently ignore this header. To make this more useful, it would be nice if it performed [service-worker-based client-side integrity verification](https://github.com/ipfs/service-worker-gateway) and/or supported DNSLink, as that is the de-facto standard for propagating this information to web browsers. Nonetheless, this is currently irrelevant for Walletbeat's purposes, as we cannot use the Orbiter gateway until wallet-controlled accounts are implemented.

#### Orbiter scorecard

- **Hosting**: ✅ IPFS hosting
- **Naming**: ✅ ENS
- **Updates**: ✅ Automated IPCM contract updates
- **Access**: 🚧 Requires non-Orbiter IPFS gateway
  - **How can Orbiter fix this**: Implement wallet-controlled accounts
- **Maintenance**: ✅ One-time CI/CD integration work
- **Payments**: ✅ KYC-free crypto payments
- **Special mentions**:
  - Gateway returns IPFS CIDs which is cool but not practically useful without further browser integration.
  - All components are GPL-licensed.
  - Potential privacy leak due to reliance on Orbiter's offchain resolver.

### EarthFast

[EarthFast](https://earthfast.com) is a hosting provider pioneering a [service-worker-based client-side content integrity verification feature](https://docs.earthfast.com/overview/architecture). On initial page load, the user's web browser downloads code for a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) from one of EarthFast's domain names, which is then used to serve all other page resources. This serving logic features integrity verification: as it proxies requests for the page's resources, it verifies the integrity of these resources against an onchain hash.

Since service workers are persistent across browser restarts, this effectively provides [Trust-on-First-Use](https://en.wikipedia.org/wiki/Trust_on_first_use) integrity verification for the site: assuming the initial page load and service worker code from the [domain node](https://docs.earthfast.com/overview/architecture#domain-node) is not compromised, the user's current and future visits will feature client-side integrity verification logic.

Like the other technologies mentioned in this document, EarthFast also puts site content hashes onchain in its smart contracts, although these contracts (such as [this one for WalletBeat's test deployment](https://sepolia.etherscan.io/address/0xf98a8a84b1de0c35004ea22dc1f71130284fad1c#code)) do not conform to a standardized interface like ERC-5219 or IPCM.

The service worker performs requests to EarthFast content nodes (e.g. `https://content18.usw2.testnet-sepolia.armadanodes.com/v1/content?project_id=[...]&resource=earthfast.json&cache-bust=[...]`) which returns a JSON list of asset URLs and expected content hashes. EarthFast's nodes retrieve this onchain data in order to return the expected content hashes to the service worker.

Despite the promising technology it offers, this setup currently makes a number of (potentially fixable) compromises which weaken the promise of bringing end-to-end integrity verification to the browser:

- The integrity verification is only TOFU-based. It should be possible to extend this further to secure the first load.
  - **How to fix**: This can be done by using DNSLink for the root page, and SRI for securing the expected hash of the service worker code.
- EarthFast content nodes are currently all operated by EarthFast-the-company. EarthFast is currently in testing, and non-EarthFast nodes are expected to be available in the future, reducing the reliance on EarthFast-the-company for EarthFast-served website, but this has not happened yet at time of writing.
  - **How to fix**: Should happen naturally with time. It is also possible for Walletbeat to [run its own content nodes](https://docs.earthfast.com/node-operators/content-node-setup) to help with this in the meantime.
- EarthFast content nodes are fully trusted by the service worker code to return accurate content hashes. This means a compromised EarthFast node can still return a fake content hash and trick the service client into downloading a malicious version of site resources.
  - **How to fix**: It is possible to remove this trust assumption by making EarthFast nodes return [light client proofs](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/) as part of its response to the service worker, such that the service worker can verify that these content hashes are indeed coming from fresh onchain data.
- EarthFast domain nodes are currently all operated by EarthFast-the-company, and there does not appear to be a way for other entities to operate their own. This means EarthFast-the-company is in a position to take down or censor the site for first-time users, as well as collect analytics data for first-time visitors to the site.
  - **How to fix**: Make it possible for other entities to operate their own domain nodes.

EarthFast currently only supports DNS names, so control over the domain cannot be fully decentralized.

_Note: EarthFast graciously hosts a copy of Walletbeat at `walletbeat.earthfast.app` and their support is appreciated! The above may sound like hard criticism, but much like it does for wallets, Walletbeat criticizes because it cares._

#### EarthFast scorecard

- **Hosting**:
  - ⏳ Not-yet-decentralized content nodes
  - ❌ Dependency on EarthFast-only domain nodes for first-time users
- **Naming**: ❌ DNS-only
- **Updates**: ✅ Automated EarthFast contract updates
- **Access**: 🙁 Requires DNS
- **Maintenance**: ✅ One-time CI/CD integration work
  - However, may need ongoing maintenance work in case Walletbeat needs to run its own content nodes to ensure sufficient decentralization.
- **Payments**: ✅ Not yet required (service free to use until then), but planning to support KYC-free crypto payments.
- **Special mentions**:
  - Relies on non-standard solutions, i.e. not using IPFS for hosting, and not using ENS records or ERC-5219 for onchain CID storage.
  - EarthFast is currently the closest practical solution to making end-to-end integrity verification happen, but important compromises remain.

### Omnipin _(formerly: Blumen)_

_Update 2025-12: Blumen is now [Omnipin](https://omnipin.eth.link/). The text below references the Blumen tool, but all of its functionality exists in Omnipin._

Unlike the other solutions on this list, [Blumen](https://blumen.stauro.dev/) is a self-custodial tool _(not a service)_ to deploy a static site to decentralized storage. It is the most "DYI" of the other approaches, as it requires the user to provide or pay for their own IPFS storage providers separately. The tool supports several large IPFS providers such as Pinata, Filebase, and Storacha. This avoids being locked into any particular IPFS provider and provides more flexibility, but also requires extra setup work relative to the other options.

Blumen **natively [supports proposing ENS record updates to a Safe multisig](https://blumen.stauro.dev/docs/safe.html)**, automatically creating a Safe wallet proposal to update the ENS domain data when an update to the site is published to IPFS. This avoids the tedious process of creating the ENS record update transaction manually. However, this still means that humans need to manually approve every content update.

Blumen also supports updating ENS records via a standard EOA that it has access to, which can be used to do human-involvement-free updates, though it requires creating and continuously funding an EOA for which the private key lives in CI/CD secrets.

Blumen supports [DNSLink updates](https://blumen.stauro.dev/docs/dnslink.html) when using Cloudflare for DNS. While this is not useful for Walletbeat, as control over a Cloudflare account cannot be split across contributors, it nonetheless represents a deep understanding from the Blumen authors of the need to provide integrity guarantees to traditional web browser users.

Blumen does not support [service-worker-based client-side integrity verification](https://github.com/ipfs/service-worker-gateway), although the use of DNSLink along with SRI means there is a credible path to having this benefit available to web browser users down the line.

#### Blumen scorecard

- **Hosting**: ✨ Multi-provider IPFS hosting
- **Naming**: ✅ ENS
- **Updates**: ✅ Automated ENS content hash CID updates
- **Access**: 🚧 Bring-your-own IPFS gateway
- **Maintenance**:
  - ✅ One-time CI/CD integration work
  - ✅ One-time work to look for suitable IPFS providers
  - 🚧 Semi-ongoing work either to keep the ENS-updating EOA funded, either to approve ENS updates via multisig
- **Payments**: ✅ Not a service, so no payments required
- **Special mentions**:
  - Support for Safe multisig proposals for ENS updates is a very cool feature.
  - Support for Swarm helps mitigate [IPFS centralization concerns](https://docs.ipfs.tech/concepts/ipni/).

### Edgeserver

[Edgeserver](https://github.com/v3xlabs/edgeserver) is an IPFS + ENS deployment solution that also features an open-source (GPL-licensed), self-hostable web server that can serve the site from a traditional web server. There is also a hosted `edgeserver.io` service which acts as a common gateway to Edgeserver sites.

(Needs additional research.)

### Quilibrium

[Quilibrium](https://quilibrium.com/) is a decentralized compute network capable of hosting web applications. One of its components is [QStorage](https://www.qstorage.quilibrium.com/) which can be used for decentralized storage similar to IPFS. Data can be uploaded to QStorage via an S3-compatible API, or by running a Quilibrium node directly.

Today, QStorage data can be accessed via a public CDN run by Quilibrium Inc. For example, the [Quorum homepage is on this CDN](https://quorum-www.qstorage.quilibrium.com/).

Other necessary bits such as QNS (Quilibrium Name System) for addressing are on the roadmap but not ready yet; notably, there is no DNS or HTTP gateway for QNS-addressed sites at this time. Content on QStorage currently needs to be addressed by a traditional DNS domain, for which control cannot easily be distributed across multiple people.

Unlike all other options on this list, QStorage credits can be purchased using KYC-free crypto payments via native crypto rails, **without dependency on payment providers** such as Stripe.

Overall, Quilibrium offers a promising solution for decentralized hosting, though its stack looks very different from all other options on this list. It is more recent and therefore not as mature as other options, but starts from a stronger and more crypto-native foundation, with the remaining work on the roadmap.

#### Quilibrium scorecard

- **Hosting**: ✅ QStorage
- **Naming**:
  - ❌ DNS-only at this time
  - ⏳ QNS on roadmap
- **Updates**: ✅ S3-like API or BYO node
- **Access**: ✅ DNS name pointed at QStorage data
- **Maintenance**:
  - ✅ One-time CI/CD integration work
  - 🚧 Potential semi-ongoing work to top up QStorage credits if exceeding free tier limits
- **Payments**: ✨ KYC-free crypto payments on crypto rails
- **Special mentions**:
  - Very different but more crypto-native stack from all other options.
  - Supports more complex sites than static sites like Walletbeat.

## Summary

**Key**:

- ❌: Dealbreaker
- ❌ / ⏳: Dealbreaker, but may change at a later date
- ✅: OK
- ✅ / 🙁: Technically OK, but not great
- ✅ / 🚧: OK, but requires extra work
- ✅ / ✨: OK, and outclasses the rest

| **Provider**   | **Hosting** | **Naming**     | **Updates**    | **Access**     | **Maintenance** | **Payments**   | **Special mentions**                |
| -------------- | ----------- | -------------- | -------------- | -------------- | --------------- | -------------- | ----------------------------------- |
| **Vercel**     | ❌          | ❌             | ❌             | ✅             | ✅ / ✨         | ❌             |                                     |
| **Fleek**      | ✅          | ✅             | ✅ / 🙁        | ✅ / 🚧        | ✅              | ✅             |                                     |
| **Orbiter**    | ✅          | ✅             | ✅             | ✅ / 🚧        | ✅              | ✅             | Open-source (GPL) components        |
| **Earthfast**  | ❌ / ⏳     | ❌             | ✅             | ✅ / 🙁        | ✅              | ✅             | Client-side integrity verification  |
| **Omnipin**    | ✅ / ✨     | ✅             | ✅             | ✅ / 🚧        | ✅ / 🚧         | ✅             | Multi-provider tool, incl. non-IPFS |
| **Quilibrium** | ✅          | ❌ / ⏳        | ✅             | ✅             | ✅              | ✅ / ✨        | More crypto-native stack            |
| **Edgeserver** | ✅          | Needs research | Needs research | Needs research | Needs research  | Needs research |                                     |

The two leading options here are Orbiter and Omnipin. Both of them tick all of the boxes, although Omnipin requires more upfront work due to the need for separately look for one or more IPFS providers. Note that both of these options require a BYO approach for the IPFS gateway, as Omnipin does not have a gateway (since it is not a service) and Orbiter's gateway is tied to Orbiter accounts which are controlled by email addresses. Therefore, the main differences between these two options comes down to pricing and to maintenance work (which is also a cost). Additionally, the use of an external IPFS gateway in both options means that the choice between these two options will not impact the URL of the site.

## Conclusion

The above table suggests using a combination of **Orbiter as an IPFS provider** (even though we would not use any of its other features), then **Omnipin for updating the ENS records**.

We can continue relying on the [`.eth.limo` IPFS gateway](https://eth.limo/) as the canonical HTTP URL. Traffic to Walletbeat should be similar or lower in volume than traffic to `vitalik.eth.limo`, so this should not overwhelm the gateway's capacity.

This means Walletbeat's canonical HTTP URL will be `https://walletbeat.eth.limo`, which will resolve the `walletbeat.eth` ENS content hash record and serve IPFS content hosted by Orbiter's underlying IPFS provider(s).

## Alternatives considered

### Just use Omnipin with one of its supported IPFS providers

This would also be a good option that simplifies the number of tools required for deployment. It may also bring down costs, as Orbiter uses downstream IPFS providers that Omnipin could deploy to directly.

However, Orbiter may eventually change its account system and/or integrate Omnipin's missing features, which would tip the scales in favor of using it entirely.

In the meantime, Walletbeat is happy to support Orbiter as a business, as their stack is fully open-source and they are doing great work to make decentralized hosting easy for other projects with related but different needs than Walletbeat.

### Just use Orbiter and stop using Omnipin

Not an option until Orbiter changes its account system to avoid potential takeover by a single human.
Additionally, Omnipin already supports unique features such as Swarm deployment and plans to support ERC-5219 deployments, making it a great option to add additional deployment mechanism that other projects can use as inspiration for setting up their own decentralized hosting deployment pipeline.
