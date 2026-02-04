// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "../src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "../src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "../src/WalletbeatTestErc721.sol";

import {Script} from "../lib/forge-std/src/Script.sol";

contract DeployContract is Script {
    function run() external returns (WalletbeatTestContract, WalletbeatTestErc20, WalletbeatTestErc721) {
        string memory erc20TokenName = "Walletbeat Testing ERC20";
        string memory erc721TokenName = "Walletbeat Testing ERC721";
        string memory tokenSymbol = "WBT";

        vm.startBroadcast();
        WalletbeatTestErc20 erc20Contract = new WalletbeatTestErc20(erc20TokenName, tokenSymbol);
        WalletbeatTestErc721 erc721Contract = new WalletbeatTestErc721(erc721TokenName, tokenSymbol);
        WalletbeatTestContract testContract =
            new WalletbeatTestContract(address(erc20Contract), address(erc721Contract));
        (bool success,) =
            address(erc20Contract).call(abi.encodeWithSignature("transferOwnership(address)", (address(testContract))));
        require(success, "Call failed");
        (success,) = address(erc721Contract)
            .call(abi.encodeWithSignature("transferOwnership(address)", (address(testContract))));
        require(success, "Call failed");
        vm.stopBroadcast();

        return (testContract, erc20Contract, erc721Contract);
    }
}
