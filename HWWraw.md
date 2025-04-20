With some inspiration from
	https://github.com/bitcoin-dot-org/bitcoin.org/blob/master/docs/managing-wallets.md
	https://walletscrutiny.com/methodology/?tests-we-run/hardware/
	https://www.ifixit.com/Wiki/Repairability_Scoring_Rubric_v2.0


Reputation
	Original product
		Is the HWW an original design or reusing a large number of third party components (physical / software) ?
	Available yet
		Is it available ?
	Risk of being not available
		If not available, is it possible to evaluate if the company will deliver ?
	Risk of being out of stock
		Has the product already been out of stock for a long time ?
	Risk of being out of warranty
		Is the provider well funded enough to apply the warranty policy ? Is it using hard to source, specific components ?
	Risk of being unsupported
Was the HWW updated last year / last 2 years ?		
	History of vulnerabilities and criticality
		Has there been vulnerabilities affecting the HWW ?
	Are vulnerabilities documented
		Evaluate the quality of the documentation / fixes / impacts
	Are vulnerabilities easy to find on manufacturer website ? 
	Bug bounty program rating
		Evaluate the scope of the bug bounty program & rewards compared to the industry
Support rating
	Is support good ? Is it available on multiple platforms ? What’s the go to platform for most customers ?
	

Supply chain (if non DIY or if pre-built DIY)
	Standalone product
		Is the HWW a standalone device or integrated into another one (such as a phone) ?
	Cost to compromise at factory
		How hard is it to compromise the device at the factory (generic MCU, no chain of trust or vulnerable chain of trust on the MCU, easy to insert new components …)
	HW provider factory OPSEC known
Is there available documentation regarding how the provider protects HWW manufacturing ? 
HW provider factory OPSEC verified
	How often is it verified, are there public certificates available ?
	Easily package tampering verification
Verify with satisfying guarantees (glitter rather than sticker) that the package has been compromised ?  
	Easy to verify the hardware
 Verify that the hardware what’s expected - BOM available, transparent case, easy to open without breaking the HWW or modifying its security properties …
Tamper resistance mechanism available for the whole device
	How easy would it be for an evil maid to do her job ? Are there tamper resistance mechanisms such as a mesh
Life expectation of the tamper resistance mechanism
	Is there a dedicated battery ? What happens when it runs out ? Can the device still be operated with a specific warning ?
	Genuine check 
		Is the a software validation to verify that the HWW is genuine ? 
	Genuine check coverage 
		What is the exact coverage of the genuine check ? Does it cover the whole device operation or only specific parts ?
	Genuine check with non personalized wallet
		Can the genuine check be run before entering critical user data ?
 Anti kleptography
Is the HWW supporting any kind of anti kleptography mechanism ? Is it compatible with third party wallets ?		

Supply chain (DIY)
No NDAs
	Is it possible to acquire all components without an NDA ?
Complexity to source components from different suppliers
How easy is it to source components from different suppliers in different regions ?

Keys handling
	Interoperable mechanism to generate master secret
		Is the mechanism used to generate the master secret well documented and not locking in the user ? 
	Extra proprietary mechanisms to handle the master secrets
		If there are extra proprietary mechanisms to handle the master secrets (backup procedure …) do they have an impact on the security of the device ?
	Is the provider ignorant of the keys ?
		Is it possible for the HWW provider to recover keys ?
	Does the device hide the keys from other devices
		Is the HWW transmitting keys to another device at any point ? Are they sent in cleartext (such as with a mifare card) ? Is the protocol known and auditable to make sure they cannot be extracted ?
	Protection against active physical attacks
		Describe the protection offered by the HWW against active physical attacks (voltage/clock/em/laser glitching) and how difficult it is to attack
	Protection against passive physical attacks
		Describe the protection offered by the HWW against passive physical attacks (device time/current/electromagnetic behavior monitoring, locally or remotely) amd how difficult it is to attack

Firmware
	Can the manufacturer or a third party force an update silently
		Is it possible at any moment to force an update without getting the user's consent ? 
	Is it necessary to authenticate before performing an update
Are updates available for download
	Are the updates distributed as binaries that can be reviewed ?
	Is downgrade of any component possible
		Is it possible to downgrade any software component of the HWW ? Is there a warning or a change in the security status of the device ?
	Is the firmware fully open source
		Also describe the licence(s) if it is
	Is the firmware partially open source
		If the firmware is not fully open source (proprietary OS, proprietary bootloader, non public bootloader …), describe the architecture choices and the licence(s) 
	How isolated are the closed source parts from the open source parts
		Is there a way for the closed source parts to “contaminate” the open source parts ? How is the isolation done ?
Have the closed source parts reviewed by an independent lab
	If there are closed source parts, describe their audits
	Is the review of the closed source parts up to date
		See how often the closed source parts are audited and if the lack of audit could change the security evaluation of the device
	Is it possible to rebuild components
		Could firmware components be rebuilt given the source code available ? Are there proprietary components necessary (build environment, SDKs …) ?
	Is it using reproducible builds
		Verify that the components can be validated against a manufacturer provided gold copy, or binary signature
	Is it possible to compare the firmware binary with the provided source code
		Are there components in the firmware binary that cannot be reproduced ? Are they well identified ? Are they matching what the manufacturer is describing ? 
	Is it possible to check which code is running on the device
		Is the HWW manufacturer providing a mechanism to authenticate the code running on the device ? Is it well described ? Is it reliable ?
	Is it possible to load a custom firmware
		Is it possible for the user to build a custom firmware and load it on the HWW ? Describe which components can be sideloaded if the whole firmware cannot, and consequences on the HWW security
	Is it possible to load a custom firmware while preserving the device integrity
		Is the device integrity modified by loading a custom firmware or specific components ? Typically, is the genuine check affected ?
	Is it possible to restore the device integrity when going back to stock firmware
		If possible, describe the security mechanisms in place to make sure that component of the custom firmware cannot persist

Hardware Privacy
	Setup without phoning home
		Can the HWW be set up without contacting the manufacturer at any point ?
	Basic operation without phoning home
		Can basic operations (getting an address, signing) be done without contacting the manufacturer ?
	Updates without phoning home
		Can updates be applied without contacting the manufacturer ? Is it the case for all updates or only some updates ?
	Phoning home necessary at some point
		Describe all operations where phoning home is necessary
	Possible to inspect what’s exchanged when phoning home
		Is it possible to inspect the data exchanged when phoning home ? If it’s using an encrypted channel, describe how turning it into an arbitrary covert channel is difficult
	Protection of data exchanged wirelessly
		If the HWW can operate wirelessly (BLE, wifi) describe how the data is protected against a local/close attacker

Interoperability
	Possible to use it with 2 independent third party wallets
		Describe 2 third party wallets not related to the manufacturers that can be used with the HWW and if there are any restrictions in its supported features when doing so
	No link to original supplier when doing so
		Describe if it is possible to identify the HWW supplier or the user when using an independent third party wallet






User safety
	Human readable addresses
		Are raw addresses easy to review ? Is the HWW displaying the ENS linked to an address if available ? 
	Human readable identification of well known contracts
		Is the HWW displaying information about well known contracts ? How reliable is it (is it considering rogue proxies updates) ? How independently chosen is it ?
	Possible to review all TX parameters raw
		Are all raw parameters from a TX displayed ? Easy to review (calldata …) ?
	Human readable review of TX parameters
		Is the HWW displaying a human readable version of some/all parameters ? Are there restrictions ?
Coverage of human readable TX parameters reviewable
	Describe how extensive/limited the display of human readable TX parameters is. Is it using independent data ? How frequently is it collected and updated ?
Easy to extend human readable TX parameters 
	Is it possible for the user to add support to get a human readable display of an unknown TX parameter ? Describe the process
	Expert mode for TX review
		Is there a mode available to sign the transaction quickly while displaying enough information to verify the TX on a secondary trusted computer ?
	Possible to review all EIP 712 parameters raw
Are all raw parameters from an EIP 712 message displayed ? Easy to review (structures, byte arrays, …) ?
	Human readable review of EIP 712 parameters
Is the HWW displaying a human readable version of some/all parameters ? Are there restrictions ?
	Coverage of human readable EIP 712 parameters reviewable
Describe how extensive/limited the display of human readable EIP 712 message parameters is. Is it using independent data ? How frequently is it collected and updated ?
	Easy to extend human readable EIP 712 parameters
Is it possible for the user to add support to get a human readable display of an unknown parameter in an EIP 712 message ? Describe the process
	Expert mode for EIP 712 review
		Is there a mode available to sign an EIP 712 message quickly while displaying enough information to verify the EIP 712 message on a secondary trusted computer ?
Risk analysis support
	Is the HWW displaying a risk evaluation / threat warning to the user when signing transactions or messages ? Describe how the evaluation works
	Risk analysis without phoning home possible
		Is it possible to run the risk analysis process without contacting the HWW manufacturer ? Describe which third parties are involved and if the full TX/message data could be recovered by a party
	Fully local risk analysis possible
		Is it possible to run the risk analysis evaluation locally ? Describe the components provided by the HWW provider and the setup. 
TX simulation support
	Is the HWW displaying high level simulation results (balance difference …) to the user when signing transactions or messages ? Describe how the evaluation works
TX simulation without phoning home possible
	Is it possible to run the simulation process without contacting the HWW manufacturer ? Describe which third parties are involved and if the full TX/message data could be recovered by a party
	Fully local TX simulation possible
		Is it possible to run the simulation locally ? Describe the components provided by the HWW provider and the setup.
	

Ecosystem alignment
	Support of EIP 1559
		Describe the state of EIP 1559 support
	Time to support EIP 1559
		How long did it take for the HWW to support EIP 1559 ?
	Support of EIP 7702
		Describe the state of EIP 7702 support
	Time to support EIP 7702
		How long did it take for the HWW to support EIP 7702 ?
	Manufacturer support of EIP 4337 UserOperations
		Is the manufacturer supporting a specific UserOperation signature ? 
	Third party support of EIP 4337 UserOperations
Is the manufacturer supporting third parties’ UserOperation signature ? Can it be used with third party wallets ? 

Maintenance
Rugged
	Is the HWW rugged / hard to break when carried around ?
MTBF known
	Is the MTBF of the HWW documented by the manufacturer ? How reliable is it (i.e. not just compiling information from the components suppliers)
Easy to fix
	Describe how easy it is to fix the HWW if some components are physically broken (screen / buttons / …). Is it designed to be repaired ? Are parts easily available ?
Easy to fix without compromising security
Can the security of the device be compromised when fixing it ? Describe what security measures are in place to prevent it or the risks	
Has a battery 
	Is there a battery in the device ? Is it easy to replace ?
Does it still work after the battery is dead
	Is the HWW still working (typically connected over USB) when the battery is dead ? Is there any change in the UX ?
Warranty period - possible to extend it
	What is the warranty period of the HWW ? Is it possible to extend it ? What is the maximum warranty period of the HWW ?
Warranty coverage
	Are there limitations (water damage, …) in the warranty ? Are they reasonable ?
