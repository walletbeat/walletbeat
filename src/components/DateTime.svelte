<script lang="ts">
	// Types
	import type { HTMLTimeAttributes } from 'svelte/elements'
	import type { CalendarDate } from '@/types/date'


	// Props
	let {
		datetime,
		...restProps
	}: HTMLTimeAttributes & {
		datetime: CalendarDate
	} = $props()


	// Functions
	import { getISO } from 'temporal-polyfill/fns/Calendar'
	import { fromString, toLocaleString } from 'temporal-polyfill/fns/PlainDate'
</script>


<time
	{datetime}
	{...restProps}
>
	{toLocaleString(fromString(datetime, getISO), 'en-US', { dateStyle: 'long' })}
</time>
