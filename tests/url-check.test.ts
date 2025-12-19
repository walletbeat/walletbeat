import { createHash } from 'crypto'
import { request } from 'https'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { hasRefs, toFullyQualified, type WithRef } from '@/schema/reference'
import { labeledUrl, type Url } from '@/schema/url'
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
]

const newValidUrls: string[] = []

const verifiedUrls: KnownValidUrl[] = []

async function checkValidUrl(url: Url): Promise<void> {
	const href = labeledUrl(url).url
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
				// These urls would always return an error Response. Skip urls to avoid failing the test.
				const SOCIALS_TO_SKIP = [
					'linkedin.com',
					'facebook.com',
					'instagram.com',
					'reddit.com',
					'tiktok.com',
				]

				const SPECIFIC_SITES_TO_SKIP = [
					'https://docs.phantom.com/',
					'https://developers.zerion.io',
					'https://help.ambire.com/hc/en-us',
				]

				for (const social of Object.values(wallet.metadata.urls?.socials ?? {})) {
					if (social === undefined) {
						continue
					}

					const urlString = labeledUrl(social).url
					const shouldSkip = SOCIALS_TO_SKIP.some(s => urlString.includes(s))
					const shouldSkipSpecific = SPECIFIC_SITES_TO_SKIP.includes(urlString)

					if (shouldSkip || shouldSkipSpecific) {
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

				if (hasRefs(x)) {
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
})
