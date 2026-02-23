// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "../src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "../src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "../src/WalletbeatTestErc721.sol";
import {WalletbeatTestErc1155} from "../src/WalletbeatTestErc1155.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Script, console} from "../lib/forge-std/src/Script.sol";

contract DeployContract is Script {
    function run()
        external
        returns (WalletbeatTestContract, WalletbeatTestErc20, WalletbeatTestErc721, WalletbeatTestErc1155)
    {
        string memory erc20TokenName = "Walletbeat Testing ERC20";
        string memory erc721TokenName = "Walletbeat Testing ERC721";
        string memory erc1155TokenName = "Walletbeat Testing ERC1155";
        string memory tokenSymbol = "WBTEST";

        string memory tokenSvg = vm.readFile("./images/Walletbeat.svg");
        string memory imageUri = svgToImageURI(tokenSvg);
        console.log(imageUri);

        vm.startBroadcast();
        WalletbeatTestErc20 erc20Contract = new WalletbeatTestErc20(erc20TokenName, tokenSymbol);
        WalletbeatTestErc1155 erc1155Contract = new WalletbeatTestErc1155(imageUri, erc1155TokenName);
        WalletbeatTestErc721 erc721Contract = new WalletbeatTestErc721(erc721TokenName, tokenSymbol, imageUri);
        WalletbeatTestContract testContract =
            new WalletbeatTestContract(address(erc20Contract), address(erc721Contract));
        vm.stopBroadcast();

        return (testContract, erc20Contract, erc721Contract, erc1155Contract);
    }

    function svgToImageURI(string memory svg) public pure returns (string memory) {
        // example:
        // '<svg width="500" height="500" viewBox="0 0 285 350" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="black" d="M150,0,L75,200,L225,200,Z"></path></svg>'
        // would return ""
        string memory baseURI = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg))) // Removing unnecessary type castings, this line can be resumed as follows : 'abi.encodePacked(svg)'
        );
        return string(abi.encodePacked(baseURI, svgBase64Encoded));
    }
}
