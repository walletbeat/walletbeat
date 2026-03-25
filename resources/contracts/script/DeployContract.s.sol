// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "../src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "../src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "../src/WalletbeatTestErc721.sol";
import {WalletbeatTestErc1155} from "../src/WalletbeatTestErc1155.sol";
import {LibZip} from "@solady/utils/LibZip.sol";
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

        /**
         * Compress SVG through LibZip by solady
         */
        bytes memory tokenSvg = bytes(vm.readFile("./images/Walletbeat.svg"));
        bytes memory compressedSvg = LibZip.flzCompress(tokenSvg);

        vm.startBroadcast();
        WalletbeatTestErc20 erc20Contract = new WalletbeatTestErc20(erc20TokenName, tokenSymbol);
        WalletbeatTestErc1155 erc1155Contract = new WalletbeatTestErc1155(erc1155TokenName);
        WalletbeatTestErc721 erc721Contract = new WalletbeatTestErc721(erc721TokenName, tokenSymbol);
        WalletbeatTestContract testContract =
            new WalletbeatTestContract(address(erc20Contract), address(erc721Contract), address(erc1155Contract));
        _appendImageInChunks(erc721Contract, erc1155Contract, compressedSvg);
        vm.stopBroadcast();
        return (testContract, erc20Contract, erc721Contract, erc1155Contract);
    }

    /**
     * @dev Need to append image in chunks because setting SVG (even when compressed) is too big.
     * Causes gas limit to fail.
     * @param erc721Contract deployed ERC-721 contract
     * @param erc1155Contract deployed ERC-1155 contract
     * @param compressedImageData compressed image data in bytes
     */
    function _appendImageInChunks(
        WalletbeatTestErc721 erc721Contract,
        WalletbeatTestErc1155 erc1155Contract,
        bytes memory compressedImageData
    ) internal {
        uint256 chunkSize = 10000;
        uint256 dataLength = compressedImageData.length;
        for (uint256 offset = 0; offset < dataLength; offset += chunkSize) {
            uint256 end = offset + chunkSize < dataLength ? offset + chunkSize : dataLength;
            bytes memory chunk = new bytes(end - offset);
            for (uint256 j = 0; j < end - offset; j++) {
                chunk[j] = compressedImageData[offset + j];
            }
            erc721Contract.appendImageData(chunk);
            erc1155Contract.appendImageData(chunk);
        }
    }
}
