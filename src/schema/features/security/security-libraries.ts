import type { WithRef } from '@/schema/reference'
import type { Url } from '@/schema/url'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/**
 * An external library that the wallet's own code calls directly to
 * generate or derive keys (e.g. BIP-32, BIP-39), sign or verify
 * signatures, or encrypt key material at rest.
 *
 * Out of scope: cryptography provided by the platform the wallet runs on
 * (TLS, WebCrypto, operating system keystores, secure enclaves), and
 * libraries that the wallet only uses through another listed library.
 */
export interface SecurityLibrary {
	/** Package or project name, e.g. `@noble/curves`. */
	name: string

	/** Source repository or homepage of the library. */
	url: Url

	/**
	 * Public reports of independent security audits of the library.
	 * Empty if no public audit report is known.
	 */
	audits: Url[]
}

/**
 * The security libraries that the wallet depends on directly.
 *
 * To test: in the wallet's source repository, look through the direct
 * dependencies of each variant (e.g. `package.json`, `Podfile`,
 * `build.gradle`, `Cargo.toml`) for libraries matching the scope of
 * `SecurityLibrary`, and link the manifest in `ref`. List audit reports
 * that the library's maintainers or auditors publish. Leave as `null` when
 * the wallet's source code is not public.
 */
export type SecurityLibraries = WithRef<{
	libraries: NonEmptyArray<SecurityLibrary>
}>
