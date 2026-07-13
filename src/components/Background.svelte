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
	})
</script>


<div class="background-blobs">
	{#each Object.entries(blobs).map( ([blobName, blob], index): BackgroundBlob & { id: string; index: number } => ({ id: blobName, index, ...completeBlob(blob) }), ) as blob (blob.id)}
		<div class="background-blob" id={blob.id} style:--blob-z-index={-1002 - blob.index}>
			<div
				class="opacity"
				style:--opacity-from={blob.opacity.fromValue}
				style:--opacity-to={blob.opacity.toValue}
				style:--opacity-duration={`${blob.opacity.seconds}s`}
			>
				<div
					class="translation-x"
					style:--translation-x-from={blob.translationX.fromValue}
					style:--translation-x-to={blob.translationX.toValue}
					style:--translation-x-duration={`${blob.translationX.seconds}s`}
				>
					<div
						class="translation-y"
						style:--translation-y-from={blob.translationY.fromValue}
						style:--translation-y-to={blob.translationY.toValue}
						style:--translation-y-duration={`${blob.translationY.seconds}s`}
					>
						<div
							class="rotation"
							style:--rotation-from={blob.rotation.fromValue}
							style:--rotation-to={blob.rotation.toValue}
							style:--rotation-duration={`${blob.rotation.seconds}s`}
						>
							<div
								class="scale-x"
								style:--scale-x-from={blob.scaleX.fromValue}
								style:--scale-x-to={blob.scaleX.toValue}
								style:--scale-x-duration={`${blob.scaleX.seconds}s`}
							>
								<div
									class="scale-y"
									style:--scale-y-from={blob.scaleY.fromValue}
									style:--scale-y-to={blob.scaleY.toValue}
									style:--scale-y-duration={`${blob.scaleY.seconds}s`}
								>
									<div
										class="hue"
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
						</div>
					</div>
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
		position: absolute;
		top: -50vh;
		left: -50vw;
		z-index: var(--blob-z-index);

		@media (prefers-reduced-motion: reduce) {
			& * {
				animation: none;
			}
		}

		@media (max-width: 600px) and (pointer: coarse) {
			display: none;
		}
	}

	.background-blob .opacity {
		animation: blob-opacity var(--opacity-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-opacity {
		from {
			opacity: var(--opacity-from);
		}
		to {
			opacity: var(--opacity-to);
		}
	}

	.background-blob .translation-x {
		animation: blob-translation-x var(--translation-x-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-translation-x {
		from {
			transform: translateX(var(--translation-x-from));
		}
		to {
			transform: translateX(var(--translation-x-to));
		}
	}

	.background-blob .translation-y {
		animation: blob-translation-y var(--translation-y-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-translation-y {
		from {
			transform: translateY(var(--translation-y-from));
		}
		to {
			transform: translateY(var(--translation-y-to));
		}
	}

	.background-blob .rotation {
		animation: blob-rotation var(--rotation-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-rotation {
		from {
			transform: rotate(var(--rotation-from));
		}
		to {
			transform: rotate(var(--rotation-to));
		}
	}

	.background-blob .scale-x {
		animation: blob-scale-x var(--scale-x-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-scale-x {
		from {
			transform: scaleX(var(--scale-x-from));
		}
		to {
			transform: scaleX(var(--scale-x-to));
		}
	}

	.background-blob .scale-y {
		animation: blob-scale-y var(--scale-y-duration) var(--transition-blob) 0s alternate infinite;
	}
	@keyframes blob-scale-y {
		from {
			transform: scaleY(var(--scale-y-from));
		}
		to {
			transform: scaleY(var(--scale-y-to));
		}
	}

	.background-blob .hue {
		animation: blob-hue var(--hue-duration) var(--transition-blob) 0s alternate infinite;
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
