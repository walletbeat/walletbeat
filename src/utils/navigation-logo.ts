import { DOMParser } from '@xmldom/xmldom'

import source from '../../public/logo.svg?raw'

const viewBox = new DOMParser()
	.parseFromString(source, 'image/svg+xml')
	.documentElement.getAttribute('viewBox')
const coordinates = viewBox?.trim().split(/\s+/).map(Number) ?? []
const [, , width, height] = coordinates

if (
	coordinates.length !== 4 ||
	width === undefined ||
	height === undefined ||
	!Number.isFinite(width) ||
	!Number.isFinite(height) ||
	width <= 0 ||
	height <= 0
) {
	throw new Error('Navigation logo requires a finite positive viewBox')
}

export const navigationLogo = { width, height }
