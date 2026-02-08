// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract WalletbeatAccessControlTest is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;
    address attacker;

    function setUp() external {
        attacker = makeAddr("attacker");
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }
    function testErc20MintOnlyOwner() external {
        vm.prank(attacker);
        vm.expectRevert("Ownable: caller is not the owner");
        erc20.mint(attacker);
    }

    function testErc20BurnOnlyOwner() external {
        vm.prank(attacker);
        vm.expectRevert("Ownable: caller is not the owner");
        erc20.burn(attacker);
    }

    function testErc20ClaimOnlyOwner() external {
        vm.prank(attacker);
        vm.expectRevert("Ownable: caller is not the owner");
        erc20.claim(attacker);
    }

    function testErc721MintOnlyOwner() external {
        vm.prank(attacker);
        vm.expectRevert("Ownable: caller is not the owner");
        erc721.mint(attacker);
    }
}