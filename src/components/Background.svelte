<script lang="ts">
	type Percent = `${number}%`
	type Angle = `${number}deg`

	interface Animation<T> {
		fromValue: T
		toValue: T
		seconds: number
	}

	interface BackgroundBlob {
		scaleX: Animation<Percent>
		translationX: Animation<Percent>
		scaleY: Animation<Percent>
		translationY: Animation<Percent>
		rotation: Animation<Angle>
		opacity: Animation<Percent>
		hue: Animation<Angle>
		lightThemeColor: string
		darkThemeColor: string
		lightThemeWeight: number
		darkThemeWeight: number
	}
	type PartialBackgroundBlob = Partial<BackgroundBlob> & Pick<BackgroundBlob, 'lightThemeColor' | 'darkThemeColor'>
	const staticValue = <T,>(staticVal: T): Animation<T> => ({
		fromValue: staticVal,
		toValue: staticVal,
		seconds: 0,
	})

	let {
		blobs,
	}: {
		blobs: Record<string, PartialBackgroundBlob>
	} = $props()

	const completeBlob = (partialBlob: PartialBackgroundBlob): BackgroundBlob => ({
		scaleX: partialBlob.scaleX ?? staticValue('100%'),
		translationX: partialBlob.translationX ?? staticValue('50%'),
		scaleY: partialBlob.scaleY ?? staticValue('100%'),
		translationY: partialBlob.translationY ?? staticValue('50%'),
		rotation: partialBlob.rotation ?? staticValue('0deg'),
		opacity: partialBlob.opacity ?? staticValue('100%'),
		hue: partialBlob.hue ?? staticValue('0deg'),
		lightThemeColor: partialBlob.lightThemeColor,
		darkThemeColor: partialBlob.darkThemeColor,
		lightThemeWeight: partialBlob.lightThemeWeight ?? 1,
		darkThemeWeight: partialBlob.darkThemeWeight ?? 1,
	})
</script>


<div class="background-blobs">
	{#each Object.entries(blobs).map( ([blobName, blob], index): BackgroundBlob & { id: string; index: number } => ({ id: blobName, index, ...completeBlob(blob) }), ) as blob (blob.id)}
		<div class="background-blob" id={blob.id} style:--blob-z-index={-1002 - blob.index}
			style:--blob-light-theme-weight={blob.lightThemeWeight}
			style:--blob-dark-theme-weight={blob.darkThemeWeight}>
			<div
				class="motion"
				style:--opacity-from={blob.opacity.fromValue}
				style:--opacity-to={blob.opacity.toValue}
				style:--opacity-duration={`${blob.opacity.seconds}s`}
				style:--translation-x-from={blob.translationX.fromValue}
				style:--translation-x-to={blob.translationX.toValue}
				style:--translation-x-duration={`${blob.translationX.seconds}s`}
				style:--translation-y-from={blob.translationY.fromValue}
				style:--translation-y-to={blob.translationY.toValue}
				style:--translation-y-duration={`${blob.translationY.seconds}s`}
			>
				<div
					class="shape"
					style:--rotation-from={blob.rotation.fromValue}
					style:--rotation-to={blob.rotation.toValue}
					style:--rotation-duration={`${blob.rotation.seconds}s`}
					style:--scale-x-from={blob.scaleX.fromValue}
					style:--scale-x-to={blob.scaleX.toValue}
					style:--scale-x-duration={`${blob.scaleX.seconds}s`}
					style:--scale-y-from={blob.scaleY.fromValue}
					style:--scale-y-to={blob.scaleY.toValue}
					style:--scale-y-duration={`${blob.scaleY.seconds}s`}
					style:--hue-from={blob.hue.fromValue}
					style:--hue-to={blob.hue.toValue}
					style:--hue-duration={`${blob.hue.seconds}s`}
				>
					<div
						class="blob"
						style:--blob-dark-theme-color={blob.darkThemeColor}
						style:--blob-light-theme-color={blob.lightThemeColor}
					></div>
				</div>
			</div>
		</div>
	{/each}
	<div class="background-dither"></div>
</div>


<style>
	.background-blobs {
		position: fixed;
		pointer-events: none;
		overflow: hidden;
		top: 0px;
		bottom: 0px;
		left: 0px;
		right: 0px;
		background: var(--background-primary);
		z-index: -1000;
	}

	.background-blob {
		---blob-weight: calc(var(--blob-light-theme-weight) * (1 - var(---theme-dark)) + var(--blob-dark-theme-weight) * var(---theme-dark));
		position: absolute;
		top: -50vh;
		left: -50vw;
		z-index: var(--blob-z-index);

		@media (max-width: 600px) and (pointer: coarse) {
			display: none;
		}
	}

	.background-blob :is(.motion, .shape) {
		animation-timing-function: var(--transition-blob);
		animation-direction: alternate;
		animation-iteration-count: infinite;

		@media (prefers-reduced-motion: reduce) {
			animation-play-state: paused;
		}
	}

	.background-blob .motion {
		animation-name: blob-opacity, blob-translation-x, blob-translation-y;
		animation-duration: var(--opacity-duration), var(--translation-x-duration), var(--translation-y-duration);
	}

	/* Translation precedes shape transforms; each axis keeps its own clock. */
	.background-blob .shape {
		animation-name: blob-rotation, blob-scale-x, blob-scale-y, blob-hue;
		animation-duration: var(--rotation-duration), var(--scale-x-duration), var(--scale-y-duration), var(--hue-duration);
	}
	@keyframes blob-opacity {
		from {
			opacity: calc(var(--opacity-from) * var(---blob-weight));
		}
		to {
			opacity: calc(var(--opacity-to) * var(---blob-weight));
		}
	}

	@keyframes blob-translation-x {
		from {
			translate: var(--translation-x-from) 0;
		}
		to {
			translate: var(--translation-x-to) 0;
		}
	}

	@keyframes blob-translation-y {
		from {
			transform: translateY(var(--translation-y-from));
		}
		to {
			transform: translateY(var(--translation-y-to));
		}
	}

	@keyframes blob-rotation {
		from {
			rotate: var(--rotation-from);
		}
		to {
			rotate: var(--rotation-to);
		}
	}

	@keyframes blob-scale-x {
		from {
			scale: var(--scale-x-from) 1;
		}
		to {
			scale: var(--scale-x-to) 1;
		}
	}

	@keyframes blob-scale-y {
		from {
			transform: scaleY(var(--scale-y-from));
		}
		to {
			transform: scaleY(var(--scale-y-to));
		}
	}

	@keyframes blob-hue {
		from {
			filter: hue-rotate(var(--hue-from));
		}
		to {
			filter: hue-rotate(var(--hue-to));
		}
	}

	.background-blob .blob {
		width: 100vw;
		height: 100vh;
		background: radial-gradient(
			ellipse 50vw 50vh at center,
			color-mix(in srgb, light-dark(var(--blob-light-theme-color), var(--blob-dark-theme-color)) 100%, transparent 0%)   0%,
			color-mix(in srgb, light-dark(var(--blob-light-theme-color), var(--blob-dark-theme-color)) 0%,   transparent 100%) 100%
		);
	}

	.background-blob .blob::after {
		content: "";
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
		background-repeat: repeat;
		opacity: 0.1337;
		pointer-events: none;
		mix-blend-mode: overlay;
	}

	.background-dither {
		position: absolute;
		top: 0px;
		left: 0px;
		bottom: 0px;
		right: 0px;
		z-index: -1001; /* Above blobs */
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
		background-repeat: repeat;
		opacity: 0.05;
		pointer-events: none;
		mix-blend-mode: overlay;
		filter: blur(1.1337px);

		@media (max-width: 600px) and (pointer: coarse) {
			display: none;
		}
	}
</style>
