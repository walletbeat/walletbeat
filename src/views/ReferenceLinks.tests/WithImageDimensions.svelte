<script lang="ts">
	import type { ComponentProps } from 'svelte'

	import { type ReferenceImageDimensions, setReferenceImageContext } from '@/utils/reference-image-context'

	import ReferenceLinks from '../ReferenceLinks.svelte'

	const { imageDimensions, ...references }: ComponentProps<typeof ReferenceLinks> & {
		imageDimensions: ReferenceImageDimensions
	} = $props()

	setReferenceImageContext(() => imageDimensions)
</script>

<ReferenceLinks {...references} />
