<script lang="ts">
 import { allHardwareModels } from '@/data/hardware-wallets'
 import { getNewsForWallet } from '@/data/news'
 import { attributeTreeForWallet } from '@/data/wallets'
 import { allWalletLadders } from '@/schema/ladders'
 import type { RatedWallet } from '@/schema/wallet'
 import { type CodeSnippetIndex, setCodeSnippetContext } from '@/utils/code-snippet-index'
 import { type ReferenceImageDimensions, setReferenceImageContext } from '@/utils/reference-image-context'
 import WalletPage from '@/views/WalletPage.svelte'
 const { wallet,codeSnippets,imageDimensions }:{wallet:RatedWallet<string>;codeSnippets:CodeSnippetIndex;imageDimensions:ReferenceImageDimensions}=$props()
 setCodeSnippetContext(()=>codeSnippets)
 setReferenceImageContext(()=>imageDimensions)
</script>
<WalletPage {wallet} walletIcon={{ src:'/native-wallet-icon.svg',width:1,height:1,format:'svg' }} hardwareModels={allHardwareModels} walletNews={getNewsForWallet(wallet.metadata.id)} attributeTree={attributeTreeForWallet(wallet)} ladders={allWalletLadders}/>
