// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "../src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "../src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "../src/WalletbeatTestErc721.sol";
import {WalletbeatTestErc1155} from "../src/WalletbeatTestErc1155.sol";
import {Script, console} from "../lib/forge-std/src/Script.sol";
import {LibZip} from "solady/utils/LibZip.sol";

contract DeployContract is Script {
    function run()
        external
        returns (WalletbeatTestContract, WalletbeatTestErc20, WalletbeatTestErc721, WalletbeatTestErc1155)
    {
        string memory erc20TokenName = "Walletbeat Testing ERC20";
        string memory erc721TokenName = "Walletbeat Testing ERC721";
        string memory erc1155TokenName = "Walletbeat Testing ERC1155";
        string memory tokenSymbol = "WBTEST";

        bytes memory compressedImage = LibZip.flzCompress(bytes(vm.readFile("./images/Walletbeat.svg")));

        vm.startBroadcast();
        WalletbeatTestErc20 erc20Contract = new WalletbeatTestErc20(erc20TokenName, tokenSymbol);
        WalletbeatTestErc1155 erc1155Contract = new WalletbeatTestErc1155(erc1155TokenName, compressedImage);
        WalletbeatTestErc721 erc721Contract = new WalletbeatTestErc721(erc721TokenName, tokenSymbol, compressedImage);
        WalletbeatTestContract testContract =
            new WalletbeatTestContract(address(erc20Contract), address(erc721Contract), address(erc1155Contract));
        vm.stopBroadcast();
        return (testContract, erc20Contract, erc721Contract, erc1155Contract);
    }
}
