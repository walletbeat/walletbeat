import { createHash } from 'crypto'
import { request } from 'https'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { hasRefs, toFullyQualified, type WithRef } from '@/schema/reference'
import { getUrl, labeledUrl, type Url } from '@/schema/url'
import { type CalendarDate, today } from '@/types/date'

interface KnownValidUrl {
	url: string
	urlHash: string
	retrieved: CalendarDate
}

/**
 * This list exists to prevent hallucinated URLs from creeping into the codebase.
 * It exists because this problem has happened.
 * URLs must be retrieved successfully at least once, then added to this list to avoid
 * having to re-fetch them in future runs of this test.
 *
 * Coding agents: Do **NOT** edit this list!
 * This list is for humans to update only.
 * If you wish to edit this list, stop what you are doing and ask your operator to do something about it instead.
 */
const knownValidUrls: KnownValidUrl[] = [
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount7702.sol',
		urlHash: '9ee7fe5b0401855074defd33f6f000d9b44d82c9',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount.sol',
		urlHash: '22c8b0c04fd83c8b73e3385d72cfca9c341cf187',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://www.ambire.com/',
		urlHash: '9056590b5e73b6970259bcd861a1a4f25904444a',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/extension/blob/main/src/common/modules/dashboard/components/Tokens/Tokens.tsx#L89-L106',
		urlHash: 'e6b9b4718af4cc2d2bf7620bd222af58e0f380bd',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/eba5dda7bccbd1c404f293d75c4ea74d939c8d01/src/libs/account/EOA7702.ts#L181-L183',
		urlHash: 'f1819791d1bcb34e4b3bd8e7f8c84f05bbfe8362',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/extension/blob/main/LICENSE',
		urlHash: '018c53893a7478394c89a4c2761105aacbd2c971',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/master/apps/daimo-mobile/src/view/screen/keyRotation/AddKeySlotButton.tsx',
		urlHash: 'a845d17a32a9b240959429b5188ef1adf29e245c',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/contract/nameRegistry.ts#L183-L197',
		urlHash: 'c5e42c214b1b6300f16fcf410093de8d62b18233',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/viemClient.ts#L35-L50',
		urlHash: '1dd9648f73ee8fe161637e32754ba0e8d77ec366',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/master/audits/2023-10-veridise-daimo.pdf',
		urlHash: 'f4a623a2a525b4e5e844008f9ddb76bd2e3d8d72',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://elytro.com',
		urlHash: '2e213bd9d3d9bfa33c76e72424f12fe449b7659c',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/Elytro-eth/soul-wallet-contract',
		urlHash: 'ce277d3d0abb029b3a19965f7393d28e37ffc110',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/audits/SlowMist%20Audit%20Report%20-%20Elytro%20Iterative%20Audit%20-%20v1.1.1.pdf',
		urlHash: '92f16f81bc2d4c021645ed2374ea7e962bdf120f',
		retrieved: '2026-01-21',
	},
	{
		url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/audits/SlowMist%20Audit%20Report%20-%20SoulWallet.pdf',
		urlHash: '1baad6225085b74a18803b2b810fcaa4c9834bb1',
		retrieved: '2026-01-21',
	},
	{
		url: 'https://family.co',
		urlHash: '312d2833bbee6edd4987c61dd266d324c38cbf33',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://frame.sh',
		urlHash: 'eceb723c41dea2999054d18a5d9b07b8921e79e6',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://gemwallet.com',
		urlHash: '30b962c6f41cda4b6fbe8e800e15ac88190ea74f',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://metamask.io',
		urlHash: 'ddd617777dd14c4d772ef645dce14808cc020d71',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://support.metamask.io/more-web3/learn/field-guide-to-bridges/',
		urlHash: 'f0a2d00d2047598d581d19f3637e04a3060e81b3',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://support.metamask.io/manage-crypto/tokens/how-to-view-your-token-balance-across-multiple-networks/',
		urlHash: '85292c97cef9e0ae82f5538ba4f79d1f9fb90e49',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/MetaMask/core/tree/main/packages',
		urlHash: 'b10087f4a0f6d32253b4b485abce382722d27342',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/MetaMask/metamask-extension/blob/main/LICENSE',
		urlHash: '07a9ab7b43d86028875bac86fc7aca96783c0988',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/MetaMask/metamask-mobile/blob/main/LICENSE',
		urlHash: '845c4b18205459fbb91be0a5cbe7ea3ab4ad371a',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://assets.ctfassets.net/clixtyxoaeas/21m4LE3WLYbgWjc33aDcp2/8252073e115688b1dc1500a9c2d33fe4/metamask-delegator-framework-audit-2024-10.pdf',
		urlHash: '13e8d550931291ff8617aefc577777e71592f627',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://assets.ctfassets.net/clixtyxoaeas/4sNMB55kkGw6BtAiIn08mm/f1f4a78d3901dd03848d070e15a1ff12/pentest-report_metamask-signing-snap.pdf',
		urlHash: '6e3c1ded5545f10407784398daffe66a592989e2',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-03-18-cyfrin-Metamask-DelegationFramework1-v2.0.pdf',
		urlHash: '5c70ba42892c9c58a0b05130acaacf22f47a690c',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-04-01-cyfrin-Metamask-DelegationFramework2-v2.0.pdf',
		urlHash: '62e258694c4d2a5c08891d28fb5a498f712a6d0c',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://www.mtpelerin.com/',
		urlHash: 'e2a5275410aa4af87e3d3ef4f121c3f0d9451f9c',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://developers.mtpelerin.com/service-information/revenue-sharing',
		urlHash: '93fe25d48aa026197acb65b8837a477ba68557f7',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://nu.fi',
		urlHash: '768b9a33d06b0ab33c87a8e88628feaa592d090b',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://support.nu.fi/support/solutions/articles/80001178239',
		urlHash: 'e3cf55040413a724e090fe4bb617e141fe5bcdd6',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://rabby.io',
		urlHash: 'bdf2dfd8e68f5d193a5546174446edda6e7b25ee',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/fa9d0988e944f67e70da67d852cf3041d3b162da/src/background/controller/provider/controller.ts#L402-L407',
		urlHash: 'ae5b23948f69b87f8ed38e206000c64e09415cc8',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet%20Desktop.pdf',
		urlHash: '5753f96cf0bc31a9fd9d8b6f66a82423bd086222',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://rainbow.me',
		urlHash: 'd644f5e836c2c0e63f2f18a4526eded90d13e236',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://safe.global',
		urlHash: 'b04af73888fa32372bee2405ef919f410547a1d6',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/f918ceb9b561dd3a27af96903071cd56c1fb5ddd/apps/web/src/services/safe-wallet-provider/index.ts#L184',
		urlHash: '7da7c72ae031938d7512ec3567cee253bbac10cb',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://bitbox.swiss/',
		urlHash: 'f0ea281aae5ae6f15d55bb3dee437b78d37fad9d',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://firefly.city/',
		urlHash: '4b5374e0b40b8c99c67b3ad24f7ef156820208db',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://www.ledger.com/',
		urlHash: '6eaef16400d9a1725ac38426ab0ff8411bbfa607',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://onekey.so/',
		urlHash: '3c9a3345f1ad10e65043374746a3a4e43e2d8502',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://trezor.io/',
		urlHash: '693376b03a7fe431819b4693b56b7deb9f52721b',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://ngrave.io/',
		urlHash: 'fc6972f7c67bd094040a6289154a1e0073848855',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://blog.ambire.com/eip-7702-wallet/',
		urlHash: '8c8ea02e6d6ce85d1fb135536cc0d00ccd8fdce6',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/contracts/AmbireAccount.sol',
		urlHash: 'fff71c2e8756a4894ca6a677ff38e48884e6cfba',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/extension/blob/main/src/web/extension-services/background/background.ts',
		urlHash: '538f8876e903f74e2400eeac3ecceb4e8223da59',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/audits/Pashov-Ambire-third-security-review.md',
		urlHash: '8f2df0e9a9dbe4ef08da29919d4a59788832f4d3',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
		urlHash: '941e22389b148f853bcdefe3122f60b574daf9b0',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/src/controllers/phishing/phishing.ts',
		urlHash: '6ccc26a8fec7f3567b523c329c35a51c5090c1fa',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/safe-fndn/safe-smart-account/blob/main/docs/Safe_Audit_Report_1_5_0_Certora.pdf',
		urlHash: 'db1d24341e14fc7f61c0d4823c856353a77d9f06',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/safe-fndn/safe-smart-account/blob/main/docs/Safe_Audit_Report_1_5_0_Ackee.pdf',
		urlHash: '9d0157e2de71d84fb5d225fb69fd6b4ab86b63a3',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://zerion.io',
		urlHash: '3dbaa0aff3a17de107b4ede050772af955291068',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://www.cypherock.com',
		urlHash: 'd5f6869ac8c564c2268d996f4df5a6c9f17852c3',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://www.ambire.com',
		urlHash: '3b41a43a21f4d0d1209715d7203802b68e96a03d',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2021/%5B20210623%5DRabby%20chrome%20extension%20Penetration%20Testing%20Report.pdf',
		urlHash: '4de756a893d258e0c399b5cf8f4c8584ca7f7df7',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2022/%5B20220318%5DSlowMist%20Audit%20Report%20-%20Rabby%20browser%20extension%20wallet.pdf',
		urlHash: '0c12cc81b82abdd74911a6f994e7efc01d510ae2',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2023/%5B20230720%5DSlowMist%20Audit%20Report%20-%20Rabby%20Wallet.pdf',
		urlHash: 'e3fba673f0acb428582f8c4562d8b6e90e10b5a8',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/Least%20Authority%20-%20Debank%20Rabby%20Walle%20Audit%20Report.pdf',
		urlHash: 'df8d42a52fb0276d50fbd19ff11ded5269756ad0',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/Cure53%20-%20Debank%20Rabby%20Wallet%20Audit%20Report.pdf',
		urlHash: 'fa0b6a2a095e1b497de684aa96e86bf648204458',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/SlowMist%20Audit%20Report%20-%20Rabby%20mobile%20wallet%20iOS.pdf',
		urlHash: '51a4009a53d08bc4c376ec9a7ea06d3924370e91',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2024/%5B20241212%5DLeast%20Authority%20-%20DeBank%20Rabby%20Wallet%20Extension%20Final%20Audit%20Report.pdf',
		urlHash: '587f37c86181eaf2295b5847e9695dd8b3bd446a',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2024/%5B20241217%5DRabby%20Browser%20Extension%20Wallet%20-%20SlowMist%20Audit%20Report.pdf',
		urlHash: '4cd45e89ca413bf099921a1aca8e6e63ef208518',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://daimo.com',
		urlHash: '3cb9fb7a3fad5bbf0581a3f54ffb923384fc3dbc',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://token.im',
		urlHash: '0ce4a9de92e7c615f36655ca206617c3d2a5127a',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://gridplus.io/',
		urlHash: '389499f1fe64edb548b5573070def41538035f30',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://imkey.im/',
		urlHash: 'a48c5da2453ffb4f5e7ba1f3f9c46bd30e1de5b9',
		retrieved: '2025-11-05',
	},
	{
		url: 'https://keyst.one/',
		urlHash: '17e49d498d1f04f47a7c79dd02974ffd60183efc',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://phantom.com',
		urlHash: '2ade81c184f3fece1b40ece8632d63685e923be6',
		retrieved: '2025-10-31',
	},
	{
		url: 'https://github.com/AmbireTech/extension',
		urlHash: 'fb3693c39d0e16fcecd756fe9bdcd6512e4a0dbe',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/daimo-eth/daimo',
		urlHash: 'c1deb6057590ad95d6c38cd5a9df85d1ba7f2eb5',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/Elytro-eth',
		urlHash: '2bd7c8c2bea748f5e90302b997431291f67e8666',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/gemwalletcom/gem-ios',
		urlHash: '20ef1311fce88a839d49b4da560ece38514ed097',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/consenlabs/token-core-monorepo',
		urlHash: '24c27cb0b84e4936627f8b5550764f28a3e69949',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/MetaMask/metamask-extension',
		urlHash: 'efffdfe52d6431678ef0bb885e7f2bbe3c36021e',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/mtpelerin',
		urlHash: '52cec4b8cefdda81f4321fe8abbe886bba90dd27',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/nufi-official/nufi',
		urlHash: '1c627e48c21b66b3217b60b7ca64bd16d79506ca',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby',
		urlHash: 'c6157bc0c8cd5286a4684049fd6b83c0cd6fe57f',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/rainbow-me/rainbow',
		urlHash: 'f02fdbb37a245bcc077f7eef8d0b1a17cd91d28b',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/safe-fndn',
		urlHash: '4623aeac8399d1112a4f85eae525881390810d6d',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/BitBoxSwiss/bitbox02-firmware',
		urlHash: 'd3a746d513e09077799d9b884c1cd9858e299836',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/Cypherock',
		urlHash: '4f3f89eea1f6e237f87c2d28a9d8b8fa6d13b944',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/GridPlus',
		urlHash: 'f2e9ad66a296755d8c55885381031d8cb9fae930',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/consenlabs/imkey-core',
		urlHash: 'bab751b002caab589b2cbe5344e067667d484eab',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/KeystoneHQ',
		urlHash: '4d2a88c5addf046b5384a8ab144a4c05ce973686',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/LedgerHQ/',
		urlHash: 'fe86af9feb4bf26014d59cdc6110f95615298437',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/OneKeyHQ',
		urlHash: '4b3df49df953e02de65257636fa32f640bf7fab2',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://github.com/trezor/trezor-suite',
		urlHash: '68f7e9858a3ae6e5abcd3aa229eb1f39e92a41bd',
		retrieved: '2025-12-04',
	},
	{
		url: 'https://bitbox.swiss/dev/',
		urlHash: 'b4f94a40360751f24aca2f8a53ad29bca1702e8e',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://docs.cypherock.com/',
		urlHash: 'dcc46d653bb007b2d8c5d19a370fa4b655a75bcb',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://docs.gridplus.io/',
		urlHash: 'cdfc6a061a08caeac0d94f0b8cca8838eaee8ee1',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://support.keyst.one/',
		urlHash: '22b43ad06c2e7bce190b83158055f30bcf2f6a8d',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://developers.ledger.com/',
		urlHash: 'aee76f91795e4822e68fd390ed195ed85cd23996',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://developer.onekey.so/',
		urlHash: '4bfb28a04b4f00411c4f9f21419a4fa87c8a17fe',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://trezor.io/learn',
		urlHash: 'ece6156a9e5fb17b96b488ee95850ac3089abe39',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/BitBoxSwiss',
		urlHash: '91c72481edcabf1553ad58e67fd05da2fec16a27',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://www.youtube.com/@bitboxswiss',
		urlHash: 'f3a0e03a260098953a460d19395b9694e7f2d427',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://t.me/cypherock',
		urlHash: 'b5f6cdc01cfdc207ba952304c48871f0b8b13d9a',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/CypherockWallet',
		urlHash: '9002d8da1e73708d4d674f7096a7a75f3561925a',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://discord.com/invite/gridplus',
		urlHash: '721caded54e216ddf169dde8a66ced15753015b9',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/gridplus/',
		urlHash: '2c0ebdda1894e8d285abac96cf269abe853b552d',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://farcaster.xyz/keystonewallet',
		urlHash: 'c0b381af10b3ec40fa34fcf7a9d720e4cb5133ad',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://t.me/KeystoneWallet',
		urlHash: 'c88ecd88c690e8202de8bf73efc8f7b8d031c6dc',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/KeystoneWallet',
		urlHash: '68b066f60ed46a29d0d73c12b0a8059720a167a8',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://www.youtube.com/channel/UCaReIdawwYPPcyWGoNunF7g',
		urlHash: '3558c0fec7ba4e6f8067d772694b16813a9f0aad',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/Ledger',
		urlHash: '768d245facd22619dec680687f01eff336ed0b47',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://discord.com/invite/gapxmWEBNJ',
		urlHash: '529970c1e8efa911b8c88160278d25e158d44e8a',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/ngrave_official',
		urlHash: 'c60578dd7cc59f374556fd2f69faac632da43363',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/OneKeyHQ',
		urlHash: '46326dbf5b61b98b8839ccc384b6d0a3420fbfe5',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://x.com/trezor',
		urlHash: '9ed6792bcfa02411b582ff840bd860044c4b8093',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://www.youtube.com/@TrezorWallet',
		urlHash: '4df76409512b9f9f52f2dfb9efc14081a9ef0729',
		retrieved: '2025-12-08',
	},
	{
		url: 'https://www.youtube.com/watch?v=R0g35dKjRtI',
		urlHash: '18accfdc98d7db3fe8da0d329de0fc07f01d0288',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://docs.gridplus.io/apps-and-integrations/lattice-manager',
		urlHash: '5a4fcf1a9f5962726e0276ecfb9ac3b8ae9f8a5a',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://guide.keyst.one/docs/keystone',
		urlHash: 'f9bec99a37876566243f6ee49468e3aeca9e7e64',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://support.ledger.com/article/360018444599-zd',
		urlHash: '8549635465c6f706108cbca9f14cbef16295ea71',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://trezor.io/guides/third-party-wallet-apps/third-party-wallet-apps-dapps',
		urlHash: '1f6bf49de87f6fcdbce0d353fc7ef8681c212685',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://support.ngrave.io/hc/en-us/articles/20045312764701-How-to-stay-safe-on-web3',
		urlHash: '826047213cd41016cbcd483f67ee42961129f5a1',
		retrieved: '2025-12-09',
	},
	{
		url: 'https://pillarx.app',
		urlHash: 'b24441fce1ec129e0c6385e34abdfe8d7b871818',
		retrieved: '2025-12-17',
	},
	{
		url: 'https://pillarx.app/login',
		urlHash: 'e1c183c8cb53133e9544eca41f8893500a686961',
		retrieved: '2025-12-17',
	},
	{
		url: 'https://chromewebstore.google.com/detail/ambire-web3-wallet/ehgjhhccekdedpbkifaojjaefeohnoea',
		urlHash: 'fcb8ae1a4993828173beb661943cc2d18378f8df',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://discord.com/invite/ambire',
		urlHash: '798bc72bdc77d29dc047b3647ffe2bdc49508e0d',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://t.me/AmbireOfficial',
		urlHash: 'b3374fcb92da0bca2a0004b9fed9542ad57b2e9a',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/ambire',
		urlHash: '0121d068421dbe1eb821ee7617fc91b0c5647d0c',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://www.youtube.com/@AmbireTech',
		urlHash: 'dc8e7917ea7e30a63432c2a63d7824b6416ea858',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://t.me/+l9coqJq9QHgyYjI1',
		urlHash: 'f0765beb9f478e627b20c1d629e99e9a4fd617e8',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/Elytro_eth',
		urlHash: '3a4317cc57bede6517bc9937e5afe1eddfd502a9',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://docs.frame.sh/',
		urlHash: 'a1a8024b6a045bc19c6a2c185a3f50ab4ebff235',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://github.com/floating/frame',
		urlHash: '08c2a73da8f0204aff551c7ccb6faab99567a9ff',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://discord.com/invite/rr4Yr3JkPq',
		urlHash: '393f9368aba3db455522d7042ec1535dc9035204',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/0xFrame',
		urlHash: '1cda6ba54424937a43a3c33fd6a9a206ccf073c6',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://docs.metamask.io/',
		urlHash: '063384e5aa34896e0eb6a3ea2e4ba308200eb066',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
		urlHash: '77c689503658e09fe775dbcde519ff3302c2475b',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://farcaster.xyz/metamask',
		urlHash: '83f57de599f487f0b15333fb3d40c43e8835b1b4',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/MetaMask',
		urlHash: 'e832939187065fe667525b07376f25e69d47064f',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/phantom',
		urlHash: '3695a86104a927c02aa37c0c11b12a2274ef5bfc',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://www.youtube.com/@phantom-wallet',
		urlHash: '38f6317c854a910c86e21e3a3847f7d267161114',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://rabbykit.rabby.io/',
		urlHash: 'decdb1be0f7fe86f7807b21aeb9998aa5e870164',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch',
		urlHash: 'f8c4af09f64e100ad15071307d4ef3e0ebaf676d',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://discord.com/invite/seFBCWmUre',
		urlHash: '639cfdb85dc5094c5974e292fc6d8dbe091c120f',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/Rabby_io',
		urlHash: 'aec4ebbd1f47b1decacdbb4dc3f90ff1da1a5878',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://rainbowkit.com/',
		urlHash: 'bab45e31f0639cd803f5ea156dd0df90746f9418',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://farcaster.xyz/rainbow',
		urlHash: '84f55618238013489f20a8ed62e9326e888f509f',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/rainbowdotme',
		urlHash: 'a5df2785570542a819ca55d26816f5480cc2ca1e',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://github.com/zeriontech/zerion-wallet-extension',
		urlHash: '625bbfdaa489e178a87e61a4eecba29cee2cde8a',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://farcaster.xyz/zerion.eth',
		urlHash: 'a10efd64786aa9c8bb2ba2c1afaa63789969bf74',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://x.com/zerion',
		urlHash: '29f2107818187fad134fad9a57879af673589146',
		retrieved: '2025-12-19',
	},
	{
		url: 'https://keycard.tech/',
		urlHash: '32dc30e035528956c74636e1d5d3f8fb0b361257',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://shell.keycard.tech/',
		urlHash: '038c9089c6734df2c266b69a545e2340aaff9679',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://keycard.tech/start/shell',
		urlHash: '8c781c8f948d32fcc0a24bfc54ea7729b2265d8c',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://github.com/keycard-tech/keycard-shell',
		urlHash: 'd210d4cdc0bd75611c2d8f1da33d4fcff8628c80',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://github.com/keycard-tech/keycard-shell/blob/master/LICENSE',
		urlHash: 'e573bfe99ee01564179ee9ad658ee0bdef6b01ce',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://github.com/keycard-tech/status-keycard',
		urlHash: '6adbdbcc11f3049cc70df872ee50fac0b5035a07',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://keycard.tech/en/developers/overview',
		urlHash: '0b3be0a3fb51551da19902877ddc31390423b983',
		retrieved: '2025-12-27',
	},
	{
		url: 'https://github.com/keycard-tech/eth-abi-repo',
		urlHash: 'f56660626b1a09693dfde026d828092fd493dcff',
		retrieved: '2025-12-27',
	},
	{
		url: 'https://x.com/Keycard_',
		urlHash: '7038cc6b902e6bf7c713e07414e344857aa1b8bd',
		retrieved: '2025-12-23',
	},
	{
		url: 'https://paydocs.daimo.com/',
		urlHash: '61c87268f1fc9bce27f1e9154054ae8c71bdda2b',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://farcaster.xyz/daimo-pay',
		urlHash: 'f081dba41dcf3d3b1e4341672b92160350bc9708',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/daimopay',
		urlHash: 'ec5585796102df3b3a0a6a8bc10b999b0ab73771',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://family.co/docs',
		urlHash: '90f9f6f88f9e8d09d7b04d2795d75ce37a075850',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/family',
		urlHash: 'ee74600b82d67efcb57a1ec9db6b86150cba3dca',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://docs.gemwallet.com/',
		urlHash: '29744c6bdbcbe6a30d7b5ce9e45978f77c73f2a2',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://discord.com/invite/4jpxtwT8r6',
		urlHash: 'a5bace08f5feb783f1775a2191dd77e890013a44',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://t.me/gemwallet',
		urlHash: '873b50b9387307280c16c405e61381d9d319bc5d',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/gemwallet',
		urlHash: '56fa69943cc6d852480a4bf6a50584a82d73212d',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://www.youtube.com/@gemwallet',
		urlHash: '369cd41255fd28ac8c7ca2a521ec56e37dac5bf4',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://docs.token.im/',
		urlHash: '0746eaee6defc62e3fb9aa2d654d025dcfd6cd3b',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://discord.com/invite/imToken',
		urlHash: '710069b164290b32e37f324f1666b427bfbaf5dd',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/imTokenOfficial',
		urlHash: '5e6f6e5064d8f057c7848dd5a7fd47f0bc7d99f3',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://discord.com/invite/WErDKTvMr7',
		urlHash: '4ae6066bc25aa3989a3847ce6431b119b57c2306',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/mtpelerin',
		urlHash: 'f2370a402d2700ec01b1ccdd807e5c027af06a67',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://www.youtube.com/@mtpelerin',
		urlHash: 'c2801fdd40afe1e6c8d49cbb565499da89aa9a8a',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://discord.com/invite/jSyVPAXw3w',
		urlHash: 'db805c6f23e06f492cf24e789a55916ec7b36ae0',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://x.com/nufiwallet',
		urlHash: '32937e1e99a11905fbcab06924e6a19fb4602627',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://docs.safe.global/',
		urlHash: '7b3f7d52c78b53db3a0f2bf40e37cdbe7dd81c12',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://developers.ledger.com/docs/clear-signing/for-wallets',
		urlHash: '71ba731db6934452b33327999ee3e1cd7dff7a68',
		retrieved: '2025-12-20',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus',
		urlHash: 'eedecf715cc2b3c6dfba8e22a9413f580e33ffb0',
		retrieved: '2026-01-12',
	},
	{
		url: 'https://chromewebstore.google.com/detail/bitget-wallet-crypto-web3/jiidiaalihmmhddjgbnbgdfflelocpak',
		urlHash: 'cb1bf5f6779c772436e55f9add6d764a456fbc59',
		retrieved: '2026-01-21',
	},
	{
		url: 'https://x.com/BitgetWallet',
		urlHash: 'b2be6e82fcd37824d1f497679611ff4a9618ff44',
		retrieved: '2026-01-21',
	},
	{
		url: 'https://web3.okx.com/',
		urlHash: 'f5c6347af281999467371460243da89157ce815c',
		retrieved: '2026-01-29',
	},
	{
		url: 'https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge',
		urlHash: '417cf3d5b9346c976bdb24828c6a932fd9729428',
		retrieved: '2026-01-29',
	},
	{
		url: 'https://x.com/wallet',
		urlHash: '9fd8107761754e932d217c8cba525769b5a2ac42',
		retrieved: '2026-01-29',
	},
	{
		url: 'https://hackerone.com/metamask/safe_harbor',
		urlHash: '22fefabd03259db123b5217a9deae2e6c9fb2eaa',
		retrieved: '2026-02-24',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/src/consts/networks.ts',
		urlHash: '432952ec60b8a3d0c4c3f285ae0e248c0dad4470',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/src/services/ensDomains/ensDomains.ts',
		urlHash: 'd569504fe14754c9e67e8d0590dc0c9dc6d26f5d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/main/src/libs/portfolio/getOnchainBalances.ts',
		urlHash: '9c1bfc857cf04c0b810b6ca297bf69e292daab31',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://x.com/ambire/status/2016861388103373134',
		urlHash: '73cfe3038a20a4cc97667482d356dba98879ac3e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://li.quest',
		urlHash: '31e2ecd6d4d933ad817ecffadae0793f1b35bb37',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/729f19c91bf07d49b78f22dcf30822c88587bd2a/src/libs/portfolio/portfolio.ts#L146-L150',
		urlHash: '3a0c952c5d99055265135613588a7e3b841f4910',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/729f19c91bf07d49b78f22dcf30822c88587bd2a/src/libs/portfolio/batcher.ts#L143',
		urlHash: '271fd557e5a42c78b9b214e73b9166d99ba9b19c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com',
		urlHash: '84b7e44aa54d002eac8d00f5bfa9cc93410f2a48',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://blog.ambire.com/ambire-x-immunefy-bug-bounty-audit-our-code-and-earn-rewards/',
		urlHash: '94ba5cbef9f4559eaca92fe07eef65de29b51d13',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/AmbireTech/ambire-common/blob/389365fa505b4a32ac378bdf64d59752160ae8eb/src/services/validations/validate.ts#L122-L133',
		urlHash: '48eacef13b9471eb01cf900dfe95c5b3914433a5',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bugrap.io/bounties/Bitget%20Wallet%20(Formerly%20BitKeep)',
		urlHash: '9910cbc809ad68a148148e10adb4283d1463eb04',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/packages/daimo-api/src/network/viemClient.ts#L128',
		urlHash: '16bfb188f957d798ba2a456fa0b178c5a559a4bf',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/master/LICENSE',
		urlHash: '09f707f78472bb9e8e1199831b34bc372d0b19f5',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://blog.ethereum.org/2024/02/20/esp-allocation-q423',
		urlHash: '390f0919fb427ccb53e55992a7e5e7cd2ad7c12e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://vote.optimism.io/retropgf/3/application/0x118a000851cf4c736497bab89993418517ac7cd9c8ede074aff408a8e0f84060',
		urlHash: '38cfa7c028b952e4de7b317fcf53078d8315d76b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/binanceClient.ts#L132',
		urlHash: 'b3141696ca64d9fe9228329cedb044193e03e17c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/apps/daimo-mobile/src/view/sheet/FarcasterBottomSheet.tsx#L141-L148',
		urlHash: 'af92475391d2c13b009e64e01c86c30e609fcc04',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/bundlerClient.ts#L131-L133',
		urlHash: '8bfc3d5c1e18710345835766de13f044c0307033',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/server/telemetry.ts#L101-L111',
		urlHash: '961d1d63cda7d6a12e610796608467c39d8a6c13',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/072e57d700ba8d2e932165a12c2741c31938f1c2/packages/daimo-api/src/api/getExchangeRates.ts',
		urlHash: '9b40a75b50116f407ff43662d22eb1f7f796880c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/.env.example#L6',
		urlHash: '173d4e603a6629f15cdc8b2244009d3b29a0f104',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/p256-verifier/blob/master/src/P256Verifier.sol',
		urlHash: '02fe5cf6c3ea473bcf83028e0553eccf2cbfc36b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/apps/daimo-mobile/src/view/screen/send/SendTransferScreen.tsx#L234-L238',
		urlHash: 'a310b3557d4889586133389b1f8aba8294372711',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/contracts/libraries/WebAuthn.sol',
		urlHash: 'cdc05573b963b71cd439521229524605647366f2',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/gemwalletcom/gem-ios/blob/main/LICENSE',
		urlHash: '1f49d019ec5b77841e356d160d7c32b36be91583',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/consenlabs/token-core-monorepo/blob/main/LICENSE',
		urlHash: '28111065d875e7889f96295dd1288eb06bc6f239',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bugrap.io/bounties/imToken%20Wallet',
		urlHash: '982b83ec0e99e47306a968d7a4d714a82ddd97f1',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://cure53.de/pentest-report_imtoken.pdf',
		urlHash: '67c8070e19e5c0cd501dc00cb4433fcf5b31487a',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/more-web3/learn/sending-or-receiving-a-transaction-with-ens/',
		urlHash: 'd893cf252a3f0f2b9505471ccf98a80b1399003d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc/',
		urlHash: '9a4ef3cfe1b036f33d53d1518357e3675fcfc4d3',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/hc/en-us/articles/360015489471',
		urlHash: '2eba31cdfe0200571401eecf46699938414ef764',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://consensys.io/blog/consensys-raises-450m-series-d-funding',
		urlHash: '6ecbf27bcbb89587abb66b6e81d087612120996b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/configure/wallet/social-login',
		urlHash: 'fb9894e3fea8ab9232a87816cf8237e6fc3aff1c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://metamask.io/security/metamask-security-program',
		urlHash: '112787f9f585315686ab1140e93ed661363a0d4d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/',
		urlHash: 'e9c2d3ba304d3309f9164ccd9a4362be18625c34',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/MetaMask/eth-phishing-detect',
		urlHash: 'c1944faa74c7f0bd4e564730d10a87eacb19ffdb',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/configure/privacy/how-to-adjust-metamask-privacy-settings/',
		urlHash: 'f9fddf8707330b597de6378eb1ee0a931caa2c5b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://immunefi.com/bug-bounty/mtpelerin/information/',
		urlHash: '04f8d40391ebe721c9daa63b53921e892d12dbe5',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://hackerone.com/okg?type=team',
		urlHash: 'ba1b5aae0ecee5f0b2cf1ff21b380ff5fe47cfd0',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/pillarwallet/x/blob/main/LICENSE',
		urlHash: '5d7e49d8b90cfcd6e84ed960668827e1a5280f8b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/5f2b84491b6af881ab4ef41f7627d5e068d10652/src/ui/views/ImportWatchAddress.tsx#L170',
		urlHash: 'deededf1e387e65792541e7d520edb4d299d6013',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/src/background/utils/buildinProvider.ts',
		urlHash: '1e8a03210a5a0f5db4fe3dfbe1ece20e84696045',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/develop/LICENSE',
		urlHash: '358b8dc86811d4ec16b68ef76bc554174c345d27',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-mobile',
		urlHash: '2888d02eb26291b8a642989ab448337567f8d430',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/LICENSE',
		urlHash: '3d5664e65ef4ceb5d5761ea1e268592337a721e8',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/constant/index.ts#L468',
		urlHash: 'd6b7c3975b4c75e65593954b88dc30d366c98d95',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/background/controller/wallet.ts#L1622',
		urlHash: 'dd433333ba0600f1c6d6786e38ca909a02513d61',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/search?q=repo%3ARabbyHub%2FRabby%20matomoRequestEvent&type=code',
		urlHash: '73862c7a8d789066c6c2c1b08449763be5f9c930',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/permit.ts#L42-L70',
		urlHash: '79dc283dd769806dd88050e46d27b7e21fea0ecf',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/tokenApprove.ts#L73-L92',
		urlHash: 'aba17f35882c8207cdd73c09251af5edd01d2ee9',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/connect.ts#L5-L73',
		urlHash: 'c52e805dcc6e442c0774fac6bc929cc245683a49',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L25-L44',
		urlHash: '0b668fabdb6737ff0ce26fe0648bebab012cc379',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L113-L132',
		urlHash: '44ddebd45ba8f86c91fc686c544e5b4b0b786d9a',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/rainbow-me/rainbow/blob/develop/LICENSE',
		urlHash: 'bdddc109d9c39189f7e97a089e81348e4ae6220b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/safe-global/safe-wallet-monorepo',
		urlHash: '0d77fb94839e0e003123241231cb81f050420446',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://gov.optimism.io/t/draft-gf-phase-1-proposal-old-template-safe/3400',
		urlHash: '8556a71be49c877b2c33956591e6d071c2a5126d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://safefoundation.org/blog/safedao-community-aligned-fees-introduction',
		urlHash: 'c04094636c1caa75514df868bf8e2e557dbc079d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://safefoundation.org/blog/safe-tokenomics',
		urlHash: '335cfc6e4a8a1bdf5e7160d69c4c300da129a208',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
		urlHash: '5c9a861a542bbae113deebe39dc11095027eef70',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/safe-fndn/safe-modules/blob/main/modules/passkey/contracts/verifiers/FCLP256Verifier.sol',
		urlHash: '134ef39d8a558a744a2ab007118a438673171fff',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.ledger.com/zerion',
		urlHash: 'd4bd733dd72122c4130350c49d3232b185c76f0b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus#how-wallet-management-work-in-zeus',
		urlHash: '8e67e6ec2e1f2a8ac8f1c619f90c284ea83eb980',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/master/src/gui/ui/dapps/across.rs',
		urlHash: '2f806b799b963a8807d8ef278aa486a2a2f983cb',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus#features',
		urlHash: 'd6374b8907729edafada870d81823c7c350d3fe0',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/8d51c76d1c6ccce5a4a845c34429a4f89ff9cdae/src/server.rs#L371',
		urlHash: '5a9ac6ed2321d0be998f70e295c89a7d57cb1090',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus#how-the-wallet-recovery-works',
		urlHash: '2ca09ed57f45b4041b280ec2ea7818d401e3da55',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/master/src/gui/ui/tx_window.rs#L246C1-L247C1',
		urlHash: '1a7fe2b0576c17c9d7a9ee5913a505d073c26214',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/master/src/utils/tx.rs#L241C1-L242C1',
		urlHash: 'aeadd4c58ac0197695666cfcc95ae893ce3771a9',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/master/src/core/tx_analysis.rs',
		urlHash: 'e564ba85343a9bba7eab50d39545f2097d584943',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://blog.bitbox.swiss/en/using-walletconnect-to-securely-connect-to-your-favorite-dapp/',
		urlHash: 'f00acef6ae0c668d46df9d353411251ed520d634',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bitbox.swiss/policies/privacy-policy/',
		urlHash: 'bb247ff2b21c09fe8e6ddfa5ff977fb63e87dd2d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bitbox.swiss/bug-bounty-program/',
		urlHash: '2b6a6c0c3dd741590c91c424b1242a3f48ef13a6',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/main/LICENSE.md',
		urlHash: 'c8b302baef5d0906000cb5f7587c3c53f6112ba5',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://entrackr.com/2022/12/hardware-wallet-startup-cypherock-raises-1-mn/',
		urlHash: '34b89e02f5b12f0c8691cfa8b355cbf861121679',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.cypherock.com/bug-bounty',
		urlHash: '6d67014dd8b42c76cf1931b1a8851afa35bafc52',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.cypherock.com/keylabs.pdf',
		urlHash: 'e678331f3bb5a9f5c9e2a6ec26f1526183291739',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://docs.cypherock.com/security-overview/introduction',
		urlHash: '189319fdea5ab3352dae389d3eee900d574d8698',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
		urlHash: 'bd1e6e8e81ced4d85f525acfb2d708c95d922c66',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.prnewswire.com/news-releases/gridplus-sets-a-new-standard-for-blockchain-security-with-the-release-of-the-enterprise-grade-lattice1-wireless-hardware-wallet-301186849.html',
		urlHash: '6af1a91973f9601305e3ef23402a564c524dc1e9',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://eips.ethereum.org/EIPS/eip-4527',
		urlHash: 'b851fade855aa347bbbc6ef1166db7a42b29d2dc',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/keylabsio/audits/blob/main/2023-11-keystone3.pdf',
		urlHash: 'eac85a515762439897c629b22475a3a03daa3800',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20Keystone3_en-us.pdf',
		urlHash: '5fb7d9dc4301dd9abda8d9ea5a7d3939b036dc75',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://blog.keyst.one/secure-elements-the-bedrock-of-hardware-wallet-security-1dd8cbdef461',
		urlHash: '7d92bfba0262298f7b566f8cdc96ced45c74c55e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.ledger.com/academy/security/the-secure-element-whistanding-security-attacks',
		urlHash: '6a5065e46b56ccc05b6593cfc31ae74a5b01ceba',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://ngrave.io/en/crypto-hardware-wallet-ngrave-raises-6m-seed-round',
		urlHash: '171865b99ba01c42ab720637bdf87f917613ca98',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://ngrave.io/en/bug-bounty-program',
		urlHash: '5547d94d0967370492af1c91b28f3f50c9bd9a44',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://ngrave.io/en/zero',
		urlHash: '8ca6403573c262e3f271432a097698c4364f89c8',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://help.onekey.so/en/articles/11461105-how-to-use-rabby-wallet-with-onekey-hardware-wallets',
		urlHash: '2ce6e3a219dad3ebab2c01ef0896fa47e46b6783',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://walletscrutiny.com/hardware/onekey.pro/',
		urlHash: '7ddba77289b9a0299585124d3138143fabb0a796',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bugrap.io/bounties/OneKey',
		urlHash: '70fc1b3a7180b7c396072d1c2eef0bd67324bc37',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20OneKey%20Pro_en-us.pdf',
		urlHash: 'ec3f9e4c982c573a7376bb2f588558e067770221',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://trezor.io/other/partner-portal/for-developers/bug-bounty-program',
		urlHash: 'ab9ae677919eabcda01ddb017dcc1b1ffe5f950c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://invictus.ambire.com',
		urlHash: '17b99560f16751649f2b5958ec1b6cceefd07c80',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://cena.ambire.com',
		urlHash: '3bf3200cca5e942710969aadad18f354e3eaad10',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://relayer.ambire.com',
		urlHash: '5ea6c9f8ff1691c35e60da3e2820390946be48b3',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://nftcdn.ambire.com',
		urlHash: '689132297983810966badd66ca4bb9c3e4d2ef6a',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://api.pimlico.io',
		urlHash: '9ee78adaa8d4b36edead2bb4a16568e805c8a483',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://bundler.biconomy.io',
		urlHash: '113483f5246a91c8d9a24ba11a2d07d862baf343',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://raw.githubusercontent.com',
		urlHash: '6145de4cdf4eb4ce8c699b5657de5d2e33746da9',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://api.github.com',
		urlHash: '67a28901561e1cf92210fb99b72d3e900aeaa2bb',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.crunchbase.com/funding_round/daimo-seed--8722ae6a',
		urlHash: '6b46f851c19deb02ba75f5ac7ce394178958d6c6',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://dune.com/gemwallet/gem-wallet',
		urlHash: '5c1ecf81b46a4310b2a2b516e5cfa2b7895e770a',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.token.im/hc/articles/360039928813',
		urlHash: 'd752184b3226352b53d1c57b624f43dd6bea6fc6',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.token.im/hc/en-us/articles/4404355206553-How-to-use-cBridge-with-imToken',
		urlHash: '96b7397d12e644c14748eb39827c2880b99e9336',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.token.im/hc/en-us/articles/900005414706-imToken-Announces-US-30-million-Series-B-Investment',
		urlHash: 'b8165717ba0498849fe424b915fd6480b9437452',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://token.im/tos-en.html',
		urlHash: '4b72e23e091500329d1aca5e565a9e3d679fddc1',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.token.im/hc/en-us/articles/25985632007193-imToken-and-Hardware-Wallets-Uncompromised-Protection-Unparalleled-Convenience',
		urlHash: 'ea97d10cc8139de2933f34b12221c6ad2b1ddc5a',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.token.im/hc/en-us/articles/21850966355737-Revamped-imToken-signature-for-safer-and-more-intuitive-transactions',
		urlHash: 'c77576067314f864df45a47f586b3d16113b1375',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://metamask.io/news/latest/metamask-security-alerts-by-blockaid-the-new-normal-for-a-safer-transaction/',
		urlHash: 'da3bbd0111fb785911f2fb5430c6164ff3454f25',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
		urlHash: 'e82b2dead80ec08db3ced77a72847928821c7869',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.crunchbase.com/funding_round/debank-series-a--65945a04',
		urlHash: '6f07759f0165e38739d40c4614a16d49820cf80d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.crunchbase.com/funding_round/debank-series-b--44225a21',
		urlHash: '2a4c9fde483e016a52a74ca3118850d060557860',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://rabby.io/download',
		urlHash: '7e2310746884123bceff49b41dd9e4998d8feb7e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://forum.safe.global/t/safedao-community-updates/4213',
		urlHash: '92b554da810d8f0066989594e8bad14488e3f8dd',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/-m1jcBFS0dc?t=300',
		urlHash: '32771e8dbdd5bf5e7860c3eaae3cda9f94c507b5',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=534',
		urlHash: '20a5a109282b920920bdf947fbbe9e5286582dda',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtube.com/shorts/YG6lzwTUojE',
		urlHash: 'f7cf6557141b90ed8d2eb0974649a873f11d5747',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://medium.com/@mark_dago/grid-progress-report-12-15-2017-fdb4e24ed2ed',
		urlHash: '547eedd1810099b1becf0232e17f336ad2443a7b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=2079',
		urlHash: 'b2c25b6f781bb3c7c3c90ff7c8a1a9320008485c',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtube.com/shorts/_s5PjZhgBig',
		urlHash: '1fa7e839c4acef25974ef03cee4b47ddf803f8a8',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://imkey.im/products/imkey-pro-crypto-hardware-wallet',
		urlHash: '5829fd9696d60ab3cbcf7697a080b9af428b07ac',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://imkey.im/pages/integrated-wallets',
		urlHash: '95da1f32d742eb49fb34e071f7837126e32c02fd',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://learn.imkey.im/hc/en-001/articles/35683788822937',
		urlHash: '671bf1641b054867b927a3651560329d9994f93e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://keycard.tech/blog/announcing-keycard-shell',
		urlHash: '93a3c3b6ca475bf21a6c1319df5f0e655905634f',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://keycard.tech/wallets',
		urlHash: '323e686c271186192f7d2d801c0fada229f38d0b',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://get.keycard.tech/pages/keycard-shell',
		urlHash: 'b3201002041a53a1b6a7a3cd9b8e0e5c44a48cd0',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://keycard.tech/developers/apdu/exportkey',
		urlHash: 'e36343b4e7a110650cee513434837847b2007997',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://keycard.tech/blog/a-shell-summer-btc-multisig-seedqr-stealth-passphrases-arrive-on-keycard-shell',
		urlHash: 'fa0684b2c3a3d4d8cc9a5ae98ba373513de3baa3',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://keyst.one/bug-bounty-program',
		urlHash: 'b74ed892983abcc41018752cb0784c05159d5358',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=759',
		urlHash: '0e0c3c3de8a49e9a320cbcd7c004853691cd9100',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtube.com/shorts/Ly9lo4g5NpA',
		urlHash: 'ece1a00162b0eb495b6d34bd27b92cdc8ca42b22',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://donjon.ledger.com/bounty',
		urlHash: 'c3f77a97de787cadb9d1b3727c566b80dc52d12d',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=1722',
		urlHash: '53f6f372471d7f2299f756c295e8b0dfb3519f12',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/-m1jcBFS0dc?t=701',
		urlHash: 'c24318f554f354fd43c7e27a7a63e2f051c10b85',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://developer.onekey.so/connect-to-software/using-walletconnect',
		urlHash: 'e8e50fafffbc0ef9a7508d8cdae60e58faebccc7',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://onekey.so/blog/updates/onekey-secures-series-b-funding/',
		urlHash: '2ffaa55d1acd83a0c7656e4f3a109058fb27d17e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://onekey.so/products/onekey-classic-1s-hardware-wallet/',
		urlHash: '25a029eee905cf378e2fa77e498e54956ec06863',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=1958',
		urlHash: 'bc9229a540bb86f497f411246da7ec26af3dbb54',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtube.com/shorts/J_XG7cNOVhM',
		urlHash: '588f650183a7f4ce435e01079ef89a929244510e',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://trezor.io/trezor-safe-3',
		urlHash: 'c1bdd7dff110cb7978e87f9c39f95a83d6bd27c1',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtu.be/9YmPWxAvKYY?t=1108',
		urlHash: '05af4180fc2ff13c19f7815a6d2f8f9ba8de9ad9',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://youtube.com/shorts/4LayLrSuHNg',
		urlHash: '41c82105039fafb0cedd243ffc9140446921f900',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://support.metamask.io/configure/wallet/how-to-turn-on-security-alerts',
		urlHash: 'adb2e6bac218dfa0bafb81ead608dab751f6c003',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://github.com/greekfetacheese/zeus/blob/master/LICENSE-MIT',
		urlHash: 'c621836600678482fcfe95f45775d52c6c4f37fc',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://www.businesswire.com/news/home/20210609005985/en/Ledger-completes-a-%24380-million-Series-C-fundraising-valuing-the-company-at-more-than-%241.5-billion-to-strengthen-its-position-as-the-leading-secure-gateway-to-digital-assets',
		urlHash: '51248182cd2888bd0982b46b288742f3b649ebdd',
		retrieved: '2026-03-08',
	},
	{
		url: 'https://docs.gridplus.io/lattice1/how-to-manage-your-seed-phrase',
		urlHash: '252cb65a18ddd62cb42a77e66e414a7a4538fc05',
		retrieved: '2026-03-13',
	},
	{
		url: 'https://pitchbook.com/profiles/company/184644-55',
		urlHash: '09c6e4d8ca088971bd6f5b05f5eca6641c5f81e3',
		retrieved: '2026-03-14',
	},
]

/**
 * URLs that should be skipped during validation checks.
 * These URLs would always return an error response, so we skip them to avoid failing the test.
 */
const URLS_TO_SKIP = [
	'docs.phantom.com',
	'developers.zerion.io',
	'help.ambire.com/hc/en-us',
	'nufi.gitbook.io/',
	'linkedin.com',
	'facebook.com',
	'instagram.com',
	'reddit.com',
	'tiktok.com',
	'web3.bitget.com',
]

const newValidUrls: string[] = []

const verifiedUrls: KnownValidUrl[] = []

async function checkValidUrl(url: Url): Promise<void> {
	const href = labeledUrl(url).url
	const urlString = getUrl(url)
	const shouldSkip = URLS_TO_SKIP.some(s => urlString.includes(s))

	if (shouldSkip) {
		return
	}

	const h = createHash('sha1')

	h.update(href)
	const digest = h.digest('hex')
	const existing = knownValidUrls.find(knownValidUrl => knownValidUrl.urlHash === digest)

	if (existing !== undefined) {
		expect(existing).toBeDefined()
		verifiedUrls.push(existing)

		return new Promise(resolve => {
			resolve()
		})
	}

	if (newValidUrls.some(newValidUrl => href === newValidUrl)) {
		expect(true).toBeDefined()

		return new Promise(resolve => {
			resolve()
		})
	}

	const isValidStatusCode = (statusCode: undefined | number): boolean => {
		if (statusCode === undefined) {
			return false
		}

		return statusCode >= 200 && statusCode <= 299
	}

	return new Promise(resolve => {
		let hasData = false
		let error: Error | null = null
		const req = request(href, res => {
			res.on('data', () => {
				hasData = true
			})
			res.on('error', err => {
				expect(err).toBeNull()
				resolve()
			})
			res.on('end', () => {
				expect(null).toSatisfy(
					() => isValidStatusCode(res.statusCode) && hasData && error === null,
					`Request to ${href} failed (HTTP status code: ${res.statusCode ?? 'unknown'})${hasData ? '' : ' (received 0 bytes)'}${error === null ? '' : `; error: ${error}`}`,
				)

				if (isValidStatusCode(res.statusCode) && hasData && error === null) {
					newValidUrls.push(
						`\t{\n\t\turl: '${href}',\n\t\turlHash: '${digest}',\n\t\tretrieved: '${today()}'\n\t},`,
					)
				}

				resolve()
			})
		})

		req.on('timeout', () => {
			expect(false).toSatisfy(x => x === null, `Request to ${href} timed out.`)
			resolve()
		})
		req.on('error', err => {
			error = err
			expect(error).toBeNull()
			resolve()
		})
		req.end()
	})
}

describe('reference URLs', () => {
	for (const wallet of Object.values(allWallets)) {
		describe(`wallet ${wallet.metadata.displayName}`, () => {
			it('has valid websites', async () => {
				for (const website of wallet.metadata.urls?.websites ?? []) {
					await checkValidUrl(website)
				}
			})
			it('has valid docs', async () => {
				for (const doc of wallet.metadata.urls?.docs ?? []) {
					await checkValidUrl(doc)
				}
			})
			it('has valid repositories', async () => {
				for (const repository of wallet.metadata.urls?.repositories ?? []) {
					await checkValidUrl(repository)
				}
			})
			it('has valid extensions', async () => {
				for (const extension of wallet.metadata.urls?.extensions ?? []) {
					await checkValidUrl(extension)
				}
			})
			it('has valid socials', async () => {
				for (const social of Object.values(wallet.metadata.urls?.socials ?? {})) {
					if (social === undefined) {
						continue
					}

					await checkValidUrl(social)
				}
			})
			it('has valid others', async () => {
				for (const other of wallet.metadata.urls?.others ?? []) {
					await checkValidUrl(other)
				}
			})
			type FieldWithRef = {
				path: string[]
				withRef: WithRef<unknown>
			}
			const refFields: FieldWithRef[] = []
			const findRefs = (path: string[], x: unknown) => {
				if (x === undefined || x === null) {
					return
				}

				if (Array.isArray(x)) {
					x.map((item, index) => findRefs(path.concat([`[${index.toString()}]`]), item))

					return
				}

				if (typeof x !== 'object') {
					return
				}

				for (const [key, val] of Object.entries(x)) {
					findRefs(path.length === 0 ? [key] : path.concat([`.${key}`]), val)
				}

				if (hasRefs(x) && toFullyQualified(x.ref).length > 0) {
					refFields.push({
						path,
						withRef: x,
					})
				}
			}

			findRefs([], wallet)

			for (const fieldWithRef of refFields) {
				describe(fieldWithRef.path.join(''), () => {
					for (const qualRef of toFullyQualified(fieldWithRef.withRef.ref)) {
						for (const qualRefUrl of qualRef.urls) {
							describe(qualRefUrl.url, () => {
								it('is valid URL', async () => {
									await checkValidUrl(qualRefUrl)
								})
							})
						}
					}
				})
			}
		})
	}
})

describe('already-known valid URLs set', () => {
	it('is exhaustive', () => {
		expect(null).toSatisfy(
			() => newValidUrls.length === 0,
			(newValidUrls.length === 1
				? 'A new valid URL was detected, and needs to be added to this test to avoid re-fetching it on every run.'
				: 'New valid URLs were detected, and need to be added to this test to avoid re-fetching them on every run.') +
				'\n\nAdd the following to `knownValidUrls`:\n\n' +
				newValidUrls.join('\n'),
		)
	})
	it('has no extraneous entries', () => {
		expect(null).toSatisfy(
			() =>
				knownValidUrls.every(knownValidUrl =>
					verifiedUrls.some(verifiedUrl => knownValidUrl.urlHash === verifiedUrl.urlHash),
				),
			'URLs were removed; please remove them from the set of known-valid URLs as well:\n\n' +
				knownValidUrls
					.filter(knownValidUrl =>
						verifiedUrls.every(verifiedUrl => knownValidUrl.urlHash !== verifiedUrl.urlHash),
					)
					.map(verifiedUrl => `- ${verifiedUrl.url}`)
					.join('\n'),
		)
	})
	it('has no duplicate entries', () => {
		for (const knownValidUrl1 of knownValidUrls) {
			expect(null).toSatisfy(
				() =>
					knownValidUrls.filter(
						knownValidUrl2 =>
							knownValidUrl1.url === knownValidUrl2.url ||
							knownValidUrl1.urlHash === knownValidUrl2.urlHash,
					).length === 1,
				`URL '${knownValidUrl1.url}' is duplicated.`,
			)
		}
	})
	describe('has valid hashes', () => {
		for (const knownValidUrl of knownValidUrls) {
			describe(knownValidUrl.url, () => {
				it('has valid hash', () => {
					const h = createHash('sha1')

					h.update(knownValidUrl.url)
					const digest = h.digest('hex')

					expect(knownValidUrl.urlHash).toEqual(digest)
				})
			})
		}
	})
})
