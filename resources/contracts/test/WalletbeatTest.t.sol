// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.24;

import {WalletbeatTestContract} from "../src/WalletbeatTestContract.sol";
import {WalletbeatTestErc20} from "../src/WalletbeatTestErc20.sol";
import {WalletbeatTestErc721} from "../src/WalletbeatTestErc721.sol";
import {DeployContract} from "../script/DeployContract.s.sol";
import {Test} from "../lib/forge-std/src/Test.sol";

contract WalletbeatTest is Test {
    DeployContract deployer;
    WalletbeatTestContract tc;
    WalletbeatTestErc20 erc20;
    WalletbeatTestErc721 erc721;
    address tester;

    function setUp() external {
        tester = makeAddr("testerAddress");
        deployer = new DeployContract();
        (tc, erc20, erc721) = deployer.run();
    }

    function testSimulation() external {
        vm.prank(tester);
        tc.simulateFunction();
        vm.stopPrank();
    }
}
