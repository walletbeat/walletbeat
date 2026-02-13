import {
	type Attribute,
	type Evaluation,
	exampleRating,
	exampleRatingUnimplemented,
	Rating,
	type Value,
} from '@/schema/attributes'
import { type ResolvedFeatures } from '@/schema/features'
import {
	appConnectionNotSupported,
	type AppIsolation,
	ExposedAccountsBehavior,
	type ExposedAccountSet,
	isAppConnectionSupportedInAppIsolation,
	sameExposedAccountSet,
} from '@/schema/features/privacy/app-isolation'
import {
	featureSupportedNoRef,
	isSupported,
	notSupported,
	supported,
} from '@/schema/features/support'
import { type FullyQualifiedReference, mergeRefs, refNotNecessary } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type AppIsolationValue = Value

function rateAppIsolation(
	appIsolation: Exclude<AppIsolation, typeof appConnectionNotSupported>,
): Evaluation<AppIsolationValue> {
	let references: FullyQualifiedReference[] = []

	if (!isSupported(appIsolation.createInAppConnectionFlow)) {
		return {
			value: {
				id: 'no_account_creation_in_connection_flow',
				displayName: 'No per-app account option',
				rating: Rating.FAIL,
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not have an option to create a new account
					as part of the app connection flow.
				`),
			},
			details: markdown(`
				When connecting to an app, {{WALLET_NAME}} does not provide a way
				to create a new account unique to the app.
			`),
			impact: paragraph(`
				Without per-app accounts, apps can correlate a user's history and
				activity across web3. While this has composability benefits, having
				this as default behavior creates an irreversible privacy problem and
				a regression from the low bar of web2 privacy practices.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should have a way to create an app-specific account
				as part of the app connection flow, and have this as the default
				option.
			`),
			references,
		}
	}

	references = mergeRefs(references, appIsolation.createInAppConnectionFlow.ref)

	if (!isSupported(appIsolation.useAppSpecificLastConnectedAddresses)) {
		return {
			value: {
				id: 'no_reuse_last_connection_addresses',
				displayName: 'No per-app account persistence',
				rating: Rating.FAIL,
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not remember which set of addresses you last
					used when connecting to an app.
				`),
			},
			details: markdown(`
				When connecting to an app you have connected to before,
				{{WALLET_NAME}} does not default to the same set of addresses as you
				had last selected.
			`),
			impact: paragraph(`
				{{WALLET_NAME}} makes it likely for the user to accidentally expose
				other addresses beyond the one they had initially intended for
				the app to be able to access. Once connected, this allows the app to
				correlate more of the user's activity than the user had initially
				intended.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should locally store the set of addresses that the
				user selected when connecting to apps, and use this set of addresses
				by default when reconnecting to them.
			`),
			references,
		}
	}

	references = mergeRefs(references, appIsolation.useAppSpecificLastConnectedAddresses.ref)

	let commonExposedAccountSet: ExposedAccountSet | null = null

	for (const exposedAccountSet of [appIsolation.ethAccounts, appIsolation.erc7846WalletConnect]) {
		if (!isSupported(exposedAccountSet)) {
			continue
		}

		references = mergeRefs(references, exposedAccountSet.ref)

		if (commonExposedAccountSet === null) {
			commonExposedAccountSet = exposedAccountSet
			continue
		}

		if (!sameExposedAccountSet(commonExposedAccountSet, exposedAccountSet)) {
			throw new Error('Unimplemented; implement this when a wallet actually does this.')
		}
	}

	if (commonExposedAccountSet === null) {
		throw new Error('Unreachable by type system')
	}

	switch (commonExposedAccountSet.defaultBehavior) {
		case ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY:
			return {
				value: {
					id: 'active_account_only',
					displayName: 'Encourages account reuse across apps',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} defaults to reusing the same account when
						connecting to various apps.
					`),
				},
				details: markdown(`
					When connecting to a new app, {{WALLET_NAME}} uses the same
					account as it does when connecting to any other app by default.
				`),
				impact: paragraph(`
					By reusing the same accounts across apps, all apps can correlate
					a user's history and activity across web3. While this has
					composability benefits, having this as default behavior creates
					an irreversible privacy problem and a regression from the low bar
					of web2 privacy practices.
				`),
				howToImprove: markdown(`
					When connecting to a new app, {{WALLET_NAME}} should offer to
					create a new account for that app by default.
				`),
				references,
			}
		case ExposedAccountsBehavior.ALL_ACCOUNTS:
			return {
				value: {
					id: 'all_accounts_exposed',
					displayName: 'All accounts exposed to all apps',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} exposes all your accounts to all connected
						apps by default.
					`),
				},
				details: markdown(`
					When connecting to an app, {{WALLET_NAME}} exposes all your
					accounts by default.
				`),
				impact: paragraph(`
					By reusing the same accounts across apps, all apps can correlate
					a user's history and activity across web3. While this has
					composability benefits, having this as default behavior creates
					an irreversible privacy problem and a regression from the low bar
					of web2 privacy practices.
				`),
				howToImprove: markdown(`
					When connecting to a new app, {{WALLET_NAME}} should offer to
					create a new account for that app by default.
				`),
				references,
			}
		case ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT:
			return {
				value: {
					id: 'app_specific_account',
					displayName: 'Per-app account',
					rating: Rating.PASS,
					shortExplanation: sentence(`
						{{WALLET_NAME}} creates app-specific accounts by default.
					`),
				},
				details: markdown(`
					When connecting to an app, {{WALLET_NAME}} offers the user to
					create a new app-specific account by default.
					Doing so improves your privacy across web3 by preventing apps
					from correlating your history across apps.
				`),
				references,
			}
		case ExposedAccountsBehavior.NO_DEFAULT:
			return {
				value: {
					id: 'no_default_behavior',
					displayName: 'Supports per-app accounts',
					rating: Rating.PARTIAL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} supports the creation of app-specific accounts.
						However, this isn't the default.
					`),
				},
				details: markdown(`
					When connecting to an app, {{WALLET_NAME}} offers the user to
					create a new app-specific account.
					Doing so improves your privacy across web3 by preventing apps
					from correlating your history across apps.
					However, this isn't the default option, which can encourage
					users to reuse accounts across apps nonetheless.
				`),
				references,
			}
	}
}

export const appIsolation: Attribute<AppIsolationValue> = {
	id: 'appIsolation',
	icon: '\u{1f3dd}', // Desert island
	displayName: 'App isolation',
	wording: {
		midSentenceName: 'app isolation',
	},
	question: sentence(`
		If you connect to an app, will it be able to learn your past activity
		from other apps by default?
	`),
	why: markdown(`
		On the web, website \`A\` is not allowed to query your browsing history from
		website \`B\` by default. This ensures your browsing activity remains private
		across websites. This principle is enshrined in the HTTP protocol as the
		[**Same-Origin Policy**](hhttps://en.wikipedia.org/wiki/Same-origin_policy):
		by default, each website has its own isolated data about a user,
		and may not obtain any other information without explicit consent.

		In web3, address reuse allows app to correlate your usage and browsing
		history across other apps. While this can be a useful feature that
		enables easy composability, it is also an irreversible privacy problem
		and a regression from web2-level privacy.

		For web3 to avoid perpetuating this privacy problem, users need to be
		able to control the amount of information each new app may learn about
		their past onchain history.

		Maintaining per-app accounts creates complex fragmentation and UX issues
		which are difficult to abstract away from users. Nonetheless, address
		reuse creates an indelible data trail for users.
	`),
	methodology: markdown(`
		Wallets are assessed based on whether they make it easy for the user to
		create a distinct account for each new app they use, and whether this is
		the default choice.

		When connecting to apps that the user previously connected to, the
		wallet must use the address(es) that were last used for this specific
		app.

		Wallets that do not support connecting to apps are exempt from this
		attribute.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: true,
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not allow the creation of per-app accounts
					during the app connection flow.
				`),
				rateAppIsolation({
					ethAccounts: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					erc7846WalletConnect: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					createInAppConnectionFlow: notSupported,
					useAppSpecificLastConnectedAddresses: featureSupportedNoRef,
				}),
			),
			exampleRating(
				paragraph(`
					The wallet does not remember the address (or set of addresses)
					that was last used when connecting to a previously-connected app.
				`),
				rateAppIsolation({
					ethAccounts: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT,
					}),
					erc7846WalletConnect: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT,
					}),
					createInAppConnectionFlow: featureSupportedNoRef,
					useAppSpecificLastConnectedAddresses: notSupported,
				}),
			),
			exampleRating(
				paragraph(`
					The wallet supports creating per-app accounts when connecting to
					an app, but the default behavior is to reuse existing accounts.
				`),
				rateAppIsolation({
					ethAccounts: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					erc7846WalletConnect: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					createInAppConnectionFlow: featureSupportedNoRef,
					useAppSpecificLastConnectedAddresses: featureSupportedNoRef,
				}),
			),
			exampleRating(
				mdParagraph(`
					The wallet has different behavior across the app connection
					standards it supports:
					\`eth_accounts\` RPC vs ERC-7846 \`wallet_connect\` RPC.
				`),
				exampleRatingUnimplemented,
			),
		],
		pass: [
			exampleRating(
				paragraph(`
					The wallet supports creating per-app accounts when connecting to
					an app, and encourages the user to do this by default.
				`),
				rateAppIsolation({
					ethAccounts: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT,
					}),
					erc7846WalletConnect: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT,
					}),
					createInAppConnectionFlow: featureSupportedNoRef,
					useAppSpecificLastConnectedAddresses: featureSupportedNoRef,
				}),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<AppIsolationValue> => {
		if (features.type !== WalletType.SOFTWARE) {
			return exempt(
				appIsolation,
				sentence('Only software wallets are expected to deal with connecting to apps.'),
				null,
			)
		}

		if (features.privacy.appIsolation === null) {
			return unrated(appIsolation, null)
		}

		if (isAppConnectionSupportedInAppIsolation(features.privacy.appIsolation)) {
			return exempt(
				appIsolation,
				sentence('{{WALLET_NAME}} does not support connecting to apps.'),
				null,
			)
		}

		return rateAppIsolation(features.privacy.appIsolation)
	},
	aggregate: pickWorstRating<AppIsolationValue>,
}
