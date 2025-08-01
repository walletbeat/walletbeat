import ForumIcon from '@mui/icons-material/Forum'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpCenterIcon from '@mui/icons-material/HelpCenter'
import { Divider, Typography } from '@mui/material'
import type React from 'react'

import {
	navigationAbout,
	navigationFaq,
	navigationFarcasterChannel,
	navigationHome,
	navigationRepository,
} from '@/components/navigation'
import { betaSiteRoot, repositoryUrl } from '@/constants'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import type { Url } from '@/schema/url'
import { ExternalLink } from '@/ui/atoms/ExternalLink'
import { IconLink } from '@/ui/atoms/IconLink'

interface FundingInfo {
	date: string
	source: string
	amount: string
	asPartOf?: Url
	details: Url
}

function AboutContents(): React.JSX.Element {
	const fundingInfos: FundingInfo[] = [
		{
			date: '2025-03',
			source: 'Ethereum Foundation',
			amount: '577.02 USD',
			asPartOf: {
				label: 'Pectra Proactive Grant Round',
				url: 'https://esp.ethereum.foundation/pectra-pgr',
			},
			details: {
				label: 'Grant Proposal',
				url: `${repositoryUrl}/tree/beta/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round`,
			},
		},
	]

	return (
		<>
			<Typography variant='body1'>
				Walletbeat is a public good project that brings transparency to the Ethereum wallet
				ecosystem.
				<br />
				<strong>
					As <ExternalLink url='https://l2beat.com'>L2Beat</ExternalLink> has done for Ethereum
					Layer 2s, Walletbeat aims to do the same for Ethereum wallets.
				</strong>
			</Typography>
			<Divider
				orientation='horizontal'
				variant='middle'
				flexItem={true}
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
					marginLeft: '10%',
					marginRight: '10%',
				}}
			/>
			<Typography variant='body1'>
				Walletbeat aims to be fair, objective and impartial in its assessment methodology of
				Ethereum wallets.
				<br />
				Where there is inherent subjectivity, such as in the decision of <em>which</em> criteria are
				used to rate and categorize wallets, Walletbeat aims to follow Ethereum&apos;s ethos and
				cypherpunk values as a guiding principle. See{' '}
				<ExternalLink url='https://vitalik.eth.limo/general/2024/12/03/wallets.html'>
					Vitalik&apos;s blog post on wallets
				</ExternalLink>{' '}
				and the{' '}
				<IconLink IconComponent={HelpCenterIcon} href={`${betaSiteRoot}/faq`}>
					Walletbeat FAQ page
				</IconLink>{' '}
				for more details.
			</Typography>
			<Divider
				orientation='horizontal'
				variant='middle'
				flexItem={true}
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
					marginLeft: '10%',
					marginRight: '10%',
				}}
			/>
			<Typography variant='body1'>
				Walletbeat is committed to transparency. Contributors reveal their affiliation and / or
				shares in wallet companies. It is an{' '}
				<IconLink IconComponent={GitHubIcon} href={repositoryUrl} target='_blank'>
					open-source project
				</IconLink>{' '}
				licensed under the Free and Open-Source MIT license. Discussions are held on the{' '}
				<IconLink IconComponent={ForumIcon} href={repositoryUrl} target='_blank'>
					public /walletbeat Farcaster channel
				</IconLink>
				.
			</Typography>
			<Divider
				orientation='horizontal'
				variant='middle'
				flexItem={true}
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
					marginLeft: '10%',
					marginRight: '10%',
				}}
			/>
			<Typography variant='body1'>
				Walletbeat has received the following funding:
				<ul style={{ listStyleType: 'disc', marginLeft: '1.5rem' }}>
					{fundingInfos.map(funding => (
						<li key={`${funding.date}-${funding.source}`}>
							<strong>{funding.date}</strong>: Received <strong>{funding.amount}</strong> from{' '}
							<strong>{funding.source}</strong>
							{funding.asPartOf !== undefined ? (
								<>
									{' '}
									as part of <ExternalLink url={funding.asPartOf} />
								</>
							) : null}
							: <ExternalLink url={funding.details} />
						</li>
					))}
				</ul>
			</Typography>
			<Typography variant='body1'>
				If further funding becomes a necessity in the future, Walletbeat aims to raise funds through
				retroactive funding, ecosystem grants, and individual donations. Walletbeat will then update
				the above list to document the date, source, and amount of such funding.
			</Typography>
			<Divider
				orientation='horizontal'
				variant='middle'
				flexItem={true}
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
					marginLeft: '10%',
					marginRight: '10%',
				}}
			/>
			<Typography variant='body1'>
				Walletbeat refuses and will continue to refuse funding from wallet-related entities.
				<br />
				Walletbeat however was originally created and is currently hosted by{' '}
				<ExternalLink url='https://fluidkey.com/'>Fluidkey</ExternalLink>, an incorporated company
				in Switzerland with a wallet offering. In order to maximize credible neutrality,
				Walletbeat&apos;s long-term ownership goal is to become an independent DAO or foundation
				(similar to L2Beat) once Walletbeat reaches a higher level of maturity and a broader set of
				regular contributors. Until this is achieved, Walletbeat will not list nor rate wallet
				software from Fluidkey.
			</Typography>
			<Divider
				orientation='horizontal'
				variant='middle'
				flexItem={true}
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
					marginLeft: '10%',
					marginRight: '10%',
				}}
			/>
			<Typography variant='body1'>
				Wallets listed on Walletbeat do not represent an endorsement and is for informational
				purposes only. If you find that something is wrong, please help Walletbeat by{' '}
				<IconLink IconComponent={GitHubIcon} href={repositoryUrl} target='_blank'>
					contributing
				</IconLink>
				!
			</Typography>
		</>
	)
}

export function AboutPage(): React.JSX.Element {
	return (
		<NavigationPageLayout
			groups={[
				{
					id: 'nav',
					items: [navigationHome],
					overflow: false,
				},
				{
					id: 'about-group',
					items: [
						{
							id: 'about',
							title: navigationAbout.title,
							icon: navigationAbout.icon,
							contentId: 'aboutHeader',
						},
					],
					overflow: true,
				},
				{
					id: 'rest-of-nav',
					items: [navigationFaq, navigationRepository, navigationFarcasterChannel],
					overflow: false,
				},
			]}
		>
			<div className='max-w-screen-lg 3xl:max-w-screen-xl mx-auto w-full'>
				<div className='flex flex-col lg:mt-10 gap-4'>
					<Typography id='aboutHeader' variant='h1' mb={1}>
						About Walletbeat
					</Typography>
					<Typography
						variant='caption'
						sx={{ fontStyle: 'italic', fontSize: '1.25rem', opacity: 0.75 }}
						mb={2}
					>
						Who watches the wallets?
					</Typography>
					<div className='flex flex-col gap-2 items-stretch justify-stretch'>
						<AboutContents />
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
