// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract WalletbeatSimulateFunctionV1Test is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;
    address tester;
    address tester2;

    function setUp() external {
        tester = makeAddr("tester");
        tester2 = makeAddr("tester2");
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    function testMintsErc20Tokens() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        uint256 expectedAmount = 1 + (10 % 100);
        assertEq(erc20.balanceOf(tester), expectedAmount);
    }

    function testMintsErc721Tokens() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        assertEq(erc721.ownerOf(1), tester);
        assertEq(erc721.ownerOf(2), tester);
        assertEq(erc721.ownerOf(3), tester);
        assertEq(erc721.balanceOf(tester), 3);
    }

    function testErc20AmountVariesByBlock() external {
        vm.roll(50);
        vm.prank(tester);
        tc.simulateFunctionV1();
        uint256 balance1 = erc20.balanceOf(tester);
        assertEq(balance1, 1 + (50 % 100));

        vm.roll(75);
        vm.prank(tester2);
        tc.simulateFunctionV1();
        uint256 balance2 = erc20.balanceOf(tester2);
        assertEq(balance2, 1 + (75 % 100));

        assertTrue(balance1 != balance2);
    }

    function testMultipleCallsAccumulateErc20() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();
        uint256 firstMint = 1 + (10 % 100);

        vm.roll(20);
        vm.prank(tester);
        tc.simulateFunctionV1();
        uint256 secondMint = 1 + (20 % 100);

        assertEq(erc20.balanceOf(tester), firstMint + secondMint);
    }

    function testDifferentUsersGetTokensIndependently() external {
        vm.roll(10);

        vm.prank(tester);
        tc.simulateFunctionV1();

        vm.prank(tester2);
        tc.simulateFunctionV1();

        assertTrue(erc20.balanceOf(tester) > 0);
        assertTrue(erc20.balanceOf(tester2) > 0);
        assertEq(erc721.ownerOf(1), tester);
        assertEq(erc721.ownerOf(2), tester);
        assertEq(erc721.ownerOf(3), tester);
        assertEq(erc721.ownerOf(4), tester2);
        assertEq(erc721.ownerOf(5), tester2);
        assertEq(erc721.ownerOf(6), tester2);
    }

    function testSecondCallMintsNextTokenId() external {
        vm.roll(4);
        vm.prank(tester);
        tc.simulateFunctionV1();
        assertEq(erc721.ownerOf(1), tester);
        assertEq(erc721.balanceOf(tester), 1);

        vm.roll(8);
        vm.prank(tester);
        tc.simulateFunctionV1();
        assertEq(erc721.ownerOf(2), tester);
        assertEq(erc721.balanceOf(tester), 2);
    }
}
