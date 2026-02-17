// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract StatelessFuzz is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;

    function setUp() external {
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    function testFuzzSimulateFunctionV1MintsCorrectErc20Amount(uint256 blockNum) external {
        blockNum = bound(blockNum, 1, 1e18);
        vm.roll(blockNum);

        address user = makeAddr("fuzzUser");
        vm.prank(user);
        tc.simulateFunctionV1();

        uint256 expectedAmount = 1 + (blockNum % 100);
        assertEq(erc20.balanceOf(user), expectedAmount);
    }

    function testFuzzSimulateFunctionV2BehaviorDependsOnBlockParity(uint256 blockNum) external {
        blockNum = bound(blockNum, 1, 1e18);
        vm.roll(blockNum);

        address user = makeAddr("fuzzUser");

        uint256 evenBlock = blockNum % 2 == 0 ? blockNum : blockNum + 1;
        vm.roll(evenBlock);
        vm.prank(user);
        tc.simulateFunctionV2();
        uint256 balanceAfterFirstCall = erc20.balanceOf(user);

        if (evenBlock % 2 == 0) {
            assertTrue(balanceAfterFirstCall > 0, "Should have minted on even block");
        }
    }

    function testFuzzClaimAlwaysBurnsAllTokens(uint256 blockNum) external {
        blockNum = bound(blockNum, 1, 1e18);
        vm.roll(blockNum);

        address user = makeAddr("fuzzUser");

        vm.prank(user);
        tc.simulateFunctionV1();

        vm.prank(user);
        tc.claim();
        assertEq(erc20.balanceOf(user), 0);
    }

    function testFuzzErc20SoulboundBlocksAllTransfers(uint256 amount) external {
        amount = bound(amount, 1, type(uint256).max);
        vm.roll(10);

        address sender = makeAddr("sender");
        address receiver = makeAddr("receiver");

        vm.prank(sender);
        tc.simulateFunctionV1();

        uint256 balance = erc20.balanceOf(sender);
        uint256 transferAmount = bound(amount, 1, balance);

        vm.prank(sender);
        vm.expectRevert(WalletbeatTestErc20.WalletbeatTestErc20__Soulbound.selector);
        erc20.transfer(receiver, transferAmount);
    }
}
