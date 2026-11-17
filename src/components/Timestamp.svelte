<script lang="ts">
 import type { CalendarDate } from '@/types/date'
 import { absoluteTimestamp, relativeTimestamp } from '@/utils/timestamp'

 let { date }: { date: CalendarDate } = $props()
</script>

<time datetime={date}>{absoluteTimestamp(date)}</time> <span class="relative-date">({relativeTimestamp(date)})</span>
