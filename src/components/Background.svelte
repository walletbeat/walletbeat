<script lang="ts">
	type Percent =
		| '0%'
		| '1%'
		| '2%'
		| '3%'
		| '4%'
		| '5%'
		| '6%'
		| '7%'
		| '8%'
		| '9%'
		| '10%'
		| '11%'
		| '12%'
		| '13%'
		| '14%'
		| '15%'
		| '16%'
		| '17%'
		| '18%'
		| '19%'
		| '20%'
		| '21%'
		| '22%'
		| '23%'
		| '24%'
		| '25%'
		| '26%'
		| '27%'
		| '28%'
		| '29%'
		| '30%'
		| '31%'
		| '32%'
		| '33%'
		| '34%'
		| '35%'
		| '36%'
		| '37%'
		| '38%'
		| '39%'
		| '40%'
		| '41%'
		| '42%'
		| '43%'
		| '44%'
		| '45%'
		| '46%'
		| '47%'
		| '48%'
		| '49%'
		| '50%'
		| '51%'
		| '52%'
		| '53%'
		| '54%'
		| '55%'
		| '56%'
		| '57%'
		| '58%'
		| '59%'
		| '60%'
		| '61%'
		| '62%'
		| '63%'
		| '64%'
		| '65%'
		| '66%'
		| '67%'
		| '68%'
		| '69%'
		| '70%'
		| '71%'
		| '72%'
		| '73%'
		| '74%'
		| '75%'
		| '76%'
		| '77%'
		| '78%'
		| '79%'
		| '80%'
		| '81%'
		| '82%'
		| '83%'
		| '84%'
		| '85%'
		| '86%'
		| '87%'
		| '88%'
		| '89%'
		| '90%'
		| '91%'
		| '92%'
		| '93%'
		| '94%'
		| '95%'
		| '96%'
		| '97%'
		| '98%'
		| '99%'
		| '100%'
	type Angle =
		| '0deg'
		| '1deg'
		| '2deg'
		| '3deg'
		| '4deg'
		| '5deg'
		| '6deg'
		| '7deg'
		| '8deg'
		| '9deg'
		| '10deg'
		| '11deg'
		| '12deg'
		| '13deg'
		| '14deg'
		| '15deg'
		| '16deg'
		| '17deg'
		| '18deg'
		| '19deg'
		| '20deg'
		| '21deg'
		| '22deg'
		| '23deg'
		| '24deg'
		| '25deg'
		| '26deg'
		| '27deg'
		| '28deg'
		| '29deg'
		| '30deg'
		| '31deg'
		| '32deg'
		| '33deg'
		| '34deg'
		| '35deg'
		| '36deg'
		| '37deg'
		| '38deg'
		| '39deg'
		| '40deg'
		| '41deg'
		| '42deg'
		| '43deg'
		| '44deg'
		| '45deg'
		| '46deg'
		| '47deg'
		| '48deg'
		| '49deg'
		| '50deg'
		| '51deg'
		| '52deg'
		| '53deg'
		| '54deg'
		| '55deg'
		| '56deg'
		| '57deg'
		| '58deg'
		| '59deg'
		| '60deg'
		| '61deg'
		| '62deg'
		| '63deg'
		| '64deg'
		| '65deg'
		| '66deg'
		| '67deg'
		| '68deg'
		| '69deg'
		| '70deg'
		| '71deg'
		| '72deg'
		| '73deg'
		| '74deg'
		| '75deg'
		| '76deg'
		| '77deg'
		| '78deg'
		| '79deg'
		| '80deg'
		| '81deg'
		| '82deg'
		| '83deg'
		| '84deg'
		| '85deg'
		| '86deg'
		| '87deg'
		| '88deg'
		| '89deg'
		| '90deg'
		| '91deg'
		| '92deg'
		| '93deg'
		| '94deg'
		| '95deg'
		| '96deg'
		| '97deg'
		| '98deg'
		| '99deg'
		| '100deg'
		| '101deg'
		| '102deg'
		| '103deg'
		| '104deg'
		| '105deg'
		| '106deg'
		| '107deg'
		| '108deg'
		| '109deg'
		| '110deg'
		| '111deg'
		| '112deg'
		| '113deg'
		| '114deg'
		| '115deg'
		| '116deg'
		| '117deg'
		| '118deg'
		| '119deg'
		| '120deg'
		| '121deg'
		| '122deg'
		| '123deg'
		| '124deg'
		| '125deg'
		| '126deg'
		| '127deg'
		| '128deg'
		| '129deg'
		| '130deg'
		| '131deg'
		| '132deg'
		| '133deg'
		| '134deg'
		| '135deg'
		| '136deg'
		| '137deg'
		| '138deg'
		| '139deg'
		| '140deg'
		| '141deg'
		| '142deg'
		| '143deg'
		| '144deg'
		| '145deg'
		| '146deg'
		| '147deg'
		| '148deg'
		| '149deg'
		| '150deg'
		| '151deg'
		| '152deg'
		| '153deg'
		| '154deg'
		| '155deg'
		| '156deg'
		| '157deg'
		| '158deg'
		| '159deg'
		| '160deg'
		| '161deg'
		| '162deg'
		| '163deg'
		| '164deg'
		| '165deg'
		| '166deg'
		| '167deg'
		| '168deg'
		| '169deg'
		| '170deg'
		| '171deg'
		| '172deg'
		| '173deg'
		| '174deg'
		| '175deg'
		| '176deg'
		| '177deg'
		| '178deg'
		| '179deg'
		| '180deg'
		| '181deg'
		| '182deg'
		| '183deg'
		| '184deg'
		| '185deg'
		| '186deg'
		| '187deg'
		| '188deg'
		| '189deg'
		| '190deg'
		| '191deg'
		| '192deg'
		| '193deg'
		| '194deg'
		| '195deg'
		| '196deg'
		| '197deg'
		| '198deg'
		| '199deg'
		| '200deg'
		| '201deg'
		| '202deg'
		| '203deg'
		| '204deg'
		| '205deg'
		| '206deg'
		| '207deg'
		| '208deg'
		| '209deg'
		| '210deg'
		| '211deg'
		| '212deg'
		| '213deg'
		| '214deg'
		| '215deg'
		| '216deg'
		| '217deg'
		| '218deg'
		| '219deg'
		| '220deg'
		| '221deg'
		| '222deg'
		| '223deg'
		| '224deg'
		| '225deg'
		| '226deg'
		| '227deg'
		| '228deg'
		| '229deg'
		| '230deg'
		| '231deg'
		| '232deg'
		| '233deg'
		| '234deg'
		| '235deg'
		| '236deg'
		| '237deg'
		| '238deg'
		| '239deg'
		| '240deg'
		| '241deg'
		| '242deg'
		| '243deg'
		| '244deg'
		| '245deg'
		| '246deg'
		| '247deg'
		| '248deg'
		| '249deg'
		| '250deg'
		| '251deg'
		| '252deg'
		| '253deg'
		| '254deg'
		| '255deg'
		| '256deg'
		| '257deg'
		| '258deg'
		| '259deg'
		| '260deg'
		| '261deg'
		| '262deg'
		| '263deg'
		| '264deg'
		| '265deg'
		| '266deg'
		| '267deg'
		| '268deg'
		| '269deg'
		| '270deg'
		| '271deg'
		| '272deg'
		| '273deg'
		| '274deg'
		| '275deg'
		| '276deg'
		| '277deg'
		| '278deg'
		| '279deg'
		| '280deg'
		| '281deg'
		| '282deg'
		| '283deg'
		| '284deg'
		| '285deg'
		| '286deg'
		| '287deg'
		| '288deg'
		| '289deg'
		| '290deg'
		| '291deg'
		| '292deg'
		| '293deg'
		| '294deg'
		| '295deg'
		| '296deg'
		| '297deg'
		| '298deg'
		| '299deg'
		| '300deg'
		| '301deg'
		| '302deg'
		| '303deg'
		| '304deg'
		| '305deg'
		| '306deg'
		| '307deg'
		| '308deg'
		| '309deg'
		| '310deg'
		| '311deg'
		| '312deg'
		| '313deg'
		| '314deg'
		| '315deg'
		| '316deg'
		| '317deg'
		| '318deg'
		| '319deg'
		| '320deg'
		| '321deg'
		| '322deg'
		| '323deg'
		| '324deg'
		| '325deg'
		| '326deg'
		| '327deg'
		| '328deg'
		| '329deg'
		| '330deg'
		| '331deg'
		| '332deg'
		| '333deg'
		| '334deg'
		| '335deg'
		| '336deg'
		| '337deg'
		| '338deg'
		| '339deg'
		| '340deg'
		| '341deg'
		| '342deg'
		| '343deg'
		| '344deg'
		| '345deg'
		| '346deg'
		| '347deg'
		| '348deg'
		| '349deg'
		| '350deg'
		| '351deg'
		| '352deg'
		| '353deg'
		| '354deg'
		| '355deg'
		| '356deg'
		| '357deg'
		| '358deg'
		| '359deg'
		| '360deg'
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
	interface PartialBackgroundBlob {
		scaleX?: BackgroundBlob['scaleX']
		translationX?: BackgroundBlob['translationX']
		scaleY?: BackgroundBlob['scaleY']
		translationY?: BackgroundBlob['translationY']
		rotation?: BackgroundBlob['rotation']
		opacity?: BackgroundBlob['opacity']
		hue?: BackgroundBlob['hue']
		lightThemeColor: BackgroundBlob['lightThemeColor']
		darkThemeColor: BackgroundBlob['darkThemeColor']
	}
	const staticValue = <T,>(staticVal: T): Animation<T> => ({
		fromValue: staticVal,
		toValue: staticVal,
		seconds: 0,
	})

	interface BackgroundProps {
		blobs: Record<string, PartialBackgroundBlob>
	}

	let { blobs }: BackgroundProps = $props()
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
	}
</style>
