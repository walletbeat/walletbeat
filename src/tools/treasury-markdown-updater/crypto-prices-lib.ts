// --- Types ---

export interface PriceDataRow {
	Date: string
	Asset: string
	Value: string
	Denomination: string
}

interface CoinGeckoHistoryResponse {
	market_data: {
		current_price: {
			usd: number
		}
	}
}

interface CoinGeckoSimplePriceResponse {
	[id: string]: {
		usd: number
	}
}

// --- Constants ---

export const STABLECOINS = new Set(['USDC', 'USDT', 'USDfc'])

// Map of asset symbol → CoinGecko coin id
const COINGECKO_IDS: Record<string, string> = {
	ETH: 'ethereum',
	BTC: 'bitcoin',
	FIL: 'filecoin',
}

// --- Helpers ---

/** Normalize an asset symbol (e.g., WETH → ETH) for price lookups. */
export function normalizeAsset(asset: string): string {
	if (asset === 'WETH') {
		return 'ETH'
	}

	return asset
}

/** Format a YYYY-MM-DD date as dd-mm-yyyy for CoinGecko history endpoint. */
function formatDateForCoinGecko(date: string): string {
	// date is expected YYYY-MM-DD
	const [year, month, day] = date.split('-')

	return `${day}-${month}-${year}`
}

/** Key used to index price entries: "YYYY-MM-DD|ASSET" */
export function priceKey(date: string, asset: string): string {
	return `${date}|${asset}`
}

// --- Fetching ---

async function fetchHistoricalPrice(asset: string, date: string): Promise<number> {
	const coinId = COINGECKO_IDS[asset]

	if (!coinId) {
		throw new Error(`No CoinGecko ID mapped for asset "${asset}"`)
	}

	const dateStr = formatDateForCoinGecko(date)
	const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${dateStr}`

	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(
			`CoinGecko history ${response.status} for ${asset} on ${date}: ${await response.text()}`,
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON from CoinGecko.
	const data = (await response.json()) as unknown as CoinGeckoHistoryResponse

	return data.market_data.current_price.usd
}

async function fetchCurrentPrice(asset: string): Promise<number> {
	const coinId = COINGECKO_IDS[asset]

	if (!coinId) {
		throw new Error(`No CoinGecko ID mapped for asset "${asset}"`)
	}

	const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`

	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(`CoinGecko simple ${response.status} for ${asset}: ${await response.text()}`)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON from CoinGecko.
	const data = (await response.json()) as unknown as CoinGeckoSimplePriceResponse

	return data[coinId]?.usd ?? NaN
}

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/** Retry a function with exponential backoff on 429 (rate limit) responses. */
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)

			// Check if this is a 429 rate limit error
			if (message.includes('429') && attempt < maxRetries) {
				const waitMs = 10_000 * Math.pow(2, attempt)

				await sleep(waitMs)
				continue
			}

			throw error
		}
	}

	// Should not reach here, but TypeScript needs it
	throw new Error('Unexpected retry exhaustion')
}

/**
 * Fetch prices for a set of (date, asset) pairs from CoinGecko.
 * For stablecoins, synthesizes a value of 1.00.
 * Returns PriceDataRow[] with one entry per pair.
 */
export async function fetchPrices(pairs: [string, string][]): Promise<PriceDataRow[]> {
	const today = new Date().toISOString().slice(0, 10)
	const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

	const results: PriceDataRow[] = []

	for (const [date, asset] of pairs) {
		if (STABLECOINS.has(asset)) {
			results.push({ Date: date, Asset: asset, Value: '1.00', Denomination: 'USD' })
			continue
		}

		let price: number

		if (date === today || date === yesterday) {
			price = await withRetry(() => fetchCurrentPrice(asset))
		} else {
			price = await withRetry(() => fetchHistoricalPrice(asset, date))
		}

		// Round to 2 decimal places for display
		results.push({
			Date: date,
			Asset: asset,
			Value: price.toFixed(2),
			Denomination: 'USD',
		})

		// Rate limiting: sleep between API calls (CoinGecko free tier ~10-30 calls/min)
		await sleep(5000)
	}

	return results
}
