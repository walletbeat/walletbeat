import { buildSnapshot } from './source-snapshot.mjs'

export const prerender = true

export async function GET() {
	return Response.json(await buildSnapshot())
}
