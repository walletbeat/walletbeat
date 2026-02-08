// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract WalletbeatTransferTest is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;
    address tester;
    address tester2;
    address recipient;

    function setUp() external {
        tester = makeAddr("tester");
        tester2 = makeAddr("tester2");
        recipient = makeAddr("recipient");
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    function testTransferMintsToCallerNotRecipient() external {
        vm.roll(10);
        vm.prank(tester);
        tc.transfer(recipient, 100);

        uint256 expectedAmount = 1 + (10 % 100);
        assertEq(erc20.balanceOf(tester), expectedAmount);
        assertEq(erc20.balanceOf(recipient), 0);
    }

    function testCannotTransferErc721BetweenUsers() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        assertEq(erc721.ownerOf(1), tester);

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestErc721.WalletbeatTestErc20__Soulbound.selector);
        erc721.transferFrom(tester, tester2, 1);
    }

    function testCannotSafeTransferErc721() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestErc721.WalletbeatTestErc20__Soulbound.selector);
        erc721.safeTransferFrom(tester, tester2, 1);
    }

    function testCannotTransferErc20BetweenUsers() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();
        assertTrue(erc20.balanceOf(tester) > 0);

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestErc20.WalletbeatTestErc20__Soulbound.selector);
        erc20.transfer(tester2, 1);
    }

    function testCannotTransferFromErc20BetweenUsers() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        vm.prank(tester);
        erc20.approve(tester2, type(uint256).max);

        vm.prank(tester2);
        vm.expectRevert(WalletbeatTestErc20.WalletbeatTestErc20__Soulbound.selector);
        erc20.transferFrom(tester, tester2, 1);
    }

    function testErc20InitialSupplyIsZero() external view {
        assertEq(erc20.totalSupply(), 0);
    }

    function testErc20SupplyIncreasesAfterMint() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        uint256 expectedAmount = 1 + (10 % 100);
        assertEq(erc20.totalSupply(), expectedAmount);
    }

    function testErc20SupplyDecreasesAfterBurn() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();
        uint256 supplyAfterMint = erc20.totalSupply();
        assertTrue(supplyAfterMint > 0);

        vm.prank(tester);
        tc.claim(); // burns all tokens
        assertEq(erc20.totalSupply(), 0);
    }
}
