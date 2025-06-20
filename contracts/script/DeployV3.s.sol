// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/PriceOracleV2.sol";
import "../src/LeverageTradingV3.sol";
import "../src/MockUSDC.sol";

contract DeployV3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Deploy PriceOracleV2
        PriceOracleV2 priceOracle = new PriceOracleV2();
        console.log("PriceOracleV2 deployed at:", address(priceOracle));
        
        // Deploy LeverageTradingV3 with updated leverage system
        LeverageTradingV3 leverageTrading = new LeverageTradingV3(
            address(usdc),
            address(priceOracle)
        );
        console.log("LeverageTradingV3 deployed at:", address(leverageTrading));
        
        // Set up oracle permissions - add the addresses that were previously authorized
        // These are the backend addresses that update prices
        address backendUpdater1 = 0x2a94E4DEee455166D6aA5868Ac0B96E986105474; // Your backend address (checksummed)
        priceOracle.setAuthorizedUpdater(backendUpdater1, true);
        console.log("Added backend updater:", backendUpdater1);
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("MockUSDC:", address(usdc));
        console.log("PriceOracleV2:", address(priceOracle));
        console.log("LeverageTradingV3:", address(leverageTrading));
        console.log("========================\n");
    }
}