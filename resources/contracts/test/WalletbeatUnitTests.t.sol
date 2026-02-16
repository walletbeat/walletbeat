// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "src/WalletbeatTestErc721.sol";
import {DeployContract} from "script/DeployContract.s.sol";
import {Test, console} from "lib/forge-std/src/Test.sol";

contract AlwaysReverts {
    fallback() external payable {
        revert();
    }
}

contract WalletbeatUnitTests is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;
    address tester;
    address tester2;
    address recipient;
    address attacker;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() external {
        tester = makeAddr("tester");
        tester2 = makeAddr("tester2");
        recipient = makeAddr("recipient");
        attacker = makeAddr("attacker");
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                         DEPLOYMENT TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/
    function testErc20Name() external view {
        assertEq(erc20.name(), "Walletbeat Testing ERC20");
    }

    function testErc721Name() external view {
        assertEq(erc721.name(), "Walletbeat Testing ERC721");
    }

    function testErc20Symbol() external view {
        assertEq(erc20.symbol(), "WBTEST");
    }

    function testErc721Symbol() external view {
        assertEq(erc721.symbol(), "WBTEST");
    }

    function testFakeTokensToClaimConstant() external view {
        assertEq(tc.FAKE_TOKENS_TO_CLAIM(), 1e18);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                    SIMULATE FUNCTION V1 TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                    SIMULATE FUNCTION V2 TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

    function testMintsOnEvenBlock() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV2();

        uint256 expectedAmount = 1 + (10 % 100);
        assertEq(erc20.balanceOf(tester), expectedAmount);
    }

    function testBurnsOnOddBlock() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV2();
        assertTrue(erc20.balanceOf(tester) > 0);

        vm.roll(11);
        vm.prank(tester);
        tc.simulateFunctionV2();
        assertEq(erc20.balanceOf(tester), 0);
    }

    function testBurnWithZeroBalanceOnOddBlock() external {
        vm.roll(11);
        vm.prank(tester);
        tc.simulateFunctionV2();
        assertEq(erc20.balanceOf(tester), 0);
    }

    function testDoesNotMintErc721() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV2();

        uint256 erc721Balance = erc721.balanceOf(tester);
        vm.assertEq(0, erc721Balance);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                           CLAIM TESTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

    function testClaimBurnsUserTokens() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();
        assertTrue(erc20.balanceOf(tester) > 0);

        vm.prank(tester);
        tc.claim();
        assertEq(erc20.balanceOf(tester), 0);
    }

    function testClaimWithZeroBalance() external {
        vm.prank(tester);
        tc.claim();
        assertEq(erc20.balanceOf(tester), 0);
    }

    function testClaimEmitsMisleadingTransferEvent() external {
        vm.prank(tester);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), tester, 1e18);
        tc.claim();
    }

    function testClaimBurnsButEventShowsMint() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();
        uint256 balanceBefore = erc20.balanceOf(tester);
        assertTrue(balanceBefore > 0);

        vm.prank(tester);
        tc.claim();

        assertEq(erc20.balanceOf(tester), 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                          TRANSFER TESTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

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
        vm.expectRevert(WalletbeatTestErc721.WalletbeatTestErc721__Soulbound.selector);
        erc721.transferFrom(tester, tester2, 1);
    }

    function testCannotSafeTransferErc721() external {
        vm.roll(10);
        vm.prank(tester);
        tc.simulateFunctionV1();

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestErc721.WalletbeatTestErc721__Soulbound.selector);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                           SUPPLY TESTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

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

    function testTransferMintsErc721ToCaller() external {
        vm.roll(10);
        vm.prank(tester);
        tc.transfer(recipient, 100);

        uint256 expectedNfts = 1 + (10 % 4);
        assertEq(erc721.balanceOf(tester), expectedNfts);
        assertEq(erc721.balanceOf(recipient), 0);
    }

    function testTransferEmitsTransferEvent() external {
        vm.roll(10);
        vm.prank(tester);
        vm.expectEmit(true, true, false, true);
        emit Transfer(tester, recipient, 100);
        tc.transfer(recipient, 100);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                       ALWAYS REVERTS TEST                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/
    function testAlwaysReverts() external {
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__AlwaysFails.selector);
        tc.alwaysFails();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:´:°•.°*/
    /*                    REVERT PATH COVERAGE TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•.•°:°.*/

    function testSimulateV1RevertsWhenErc20CallFails() external {
        AlwaysReverts badTarget = new AlwaysReverts();
        WalletbeatTestContract badTc = new WalletbeatTestContract(address(badTarget), address(erc721));

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__ERC20CallFailed.selector);
        badTc.simulateFunctionV1();
    }

    function testSimulateV1RevertsWhenErc721CallFails() external {
        AlwaysReverts badTarget = new AlwaysReverts();
        WalletbeatTestContract badTc = new WalletbeatTestContract(address(erc20), address(badTarget));

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__ERC721CallFailed.selector);
        badTc.simulateFunctionV1();
    }

    function testTransferRevertsWhenErc20CallFails() external {
        AlwaysReverts badTarget = new AlwaysReverts();
        WalletbeatTestContract badTc = new WalletbeatTestContract(address(badTarget), address(erc721));

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__ERC20CallFailed.selector);
        badTc.transfer(recipient, 100);
    }

    function testTransferRevertsWhenErc721CallFails() external {
        AlwaysReverts badTarget = new AlwaysReverts();
        WalletbeatTestContract badTc = new WalletbeatTestContract(address(erc20), address(badTarget));

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__ERC721CallFailed.selector);
        badTc.transfer(recipient, 100);
    }

    function testClaimRevertsWhenErc20CallFails() external {
        AlwaysReverts badTarget = new AlwaysReverts();
        WalletbeatTestContract badTc = new WalletbeatTestContract(address(badTarget), address(erc721));

        vm.prank(tester);
        vm.expectRevert(WalletbeatTestContract.WalletbeatTestContract__ERC20CallFailed.selector);
        badTc.claim();
    }
}
