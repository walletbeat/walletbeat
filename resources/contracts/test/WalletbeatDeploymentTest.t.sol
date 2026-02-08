// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract WalletbeatDeploymentTest is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;

    function setUp() external {
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    function testErc20OwnerIsTestContract() external view {
        assertEq(erc20.owner(), address(tc));
    }

    function testErc721OwnerIsTestContract() external view {
        assertEq(erc721.owner(), address(tc));
    }

    function testErc20Name() external view {
        assertEq(erc20.name(), "Walletbeat Testing ERC20");
    }

    function testErc721Name() external view {
        assertEq(erc721.name(), "Walletbeat Testing ERC721");
    }

    function testErc20Symbol() external view {
        assertEq(erc20.symbol(), "WBT");
    }

    function testErc721Symbol() external view {
        assertEq(erc721.symbol(), "WBT");
    }

    function testFakeTokensToClaimConstant() external view {
        assertEq(tc.FAKE_TOKENS_TO_CLAIM(), 1e18);
    }
}
