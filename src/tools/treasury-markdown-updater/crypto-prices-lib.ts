import { type CalendarDate, daysBetween, today } from '@/types/date'

export interface PriceDataRow {
	Date: CalendarDate
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

/** Key used to index price entries: "YYYY-MM-DD|ASSET" */
export function priceKey(date: CalendarDate, asset: string): string {
	return `${date}|${asset}`
}

// --- Fetching ---

async function fetchHistoricalPrice(asset: string, date: CalendarDate): Promise<number> {
	const coinId = COINGECKO_IDS[asset]

	if (!coinId) {
		throw new Error(`No CoinGecko ID mapped for asset "${asset}"`)
	}

	const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${date}`

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
export async function fetchPrices(pairs: [CalendarDate, string][]): Promise<PriceDataRow[]> {
	const currentDate = today()

	const results: PriceDataRow[] = []

	for (const [date, asset] of pairs) {
		const isStablecoin = STABLECOINS.has(asset)
		let price = 1

		if (!isStablecoin) {
			const isRecent = Math.abs(daysBetween(currentDate, date)) <= 1

			price = await withRetry(() =>
				isRecent ? fetchCurrentPrice(asset) : fetchHistoricalPrice(asset, date),
			)
		}

		results.push({
			Date: date,
			Asset: asset,
			Value: price.toFixed(2),
			Denomination: 'USD',
		})

		// Rate limiting: sleep between API calls (CoinGecko free tier ~10-30 calls/min)
		if (!isStablecoin) {
			await sleep(5000)
		}
	}

	return results
}
