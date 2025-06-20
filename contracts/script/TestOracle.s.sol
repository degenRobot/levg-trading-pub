// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/PriceOracleV2.sol";

contract TestOracleScript is Script {
    function run() external {
        // Oracle address from .env
        address oracleAddress = 0x47c05BCCA7d57c87083EB4e586007530eE4539e9;
        PriceOracleV2 oracle = PriceOracleV2(oracleAddress);
        
        // Test wallet addresses
        address wallet1 = 0x48834c814E9d7869EE8e1059bd4B9B27b3b1910F;
        address wallet2 = 0xE504fF4631e564DbC168a34C9d195FfEA988C622;
        address wallet3 = 0x7AdFc5772300A55EC2C7506ca27CfB3e3BFa05Ea;
        
        console.log("=== Oracle Status Check ===");
        console.log("Oracle Address:", oracleAddress);
        console.log("Owner:", oracle.owner());
        console.log("");
        
        // Check authorization status
        console.log("Authorization Status:");
        console.log("Wallet 1 authorized:", oracle.authorizedUpdaters(wallet1));
        console.log("Wallet 2 authorized:", oracle.authorizedUpdaters(wallet2));
        console.log("Wallet 3 authorized:", oracle.authorizedUpdaters(wallet3));
        console.log("");
        
        // Check current prices
        console.log("Current Prices:");
        try oracle.getLatestPrice("BTCUSD") returns (uint256 btcPrice, uint256 btcLastUpdate) {
            console.log("BTCUSD:", btcPrice, "Last Update:", btcLastUpdate);
        } catch {
            console.log("BTCUSD: No price data");
        }
        
        try oracle.getLatestPrice("ETHUSD") returns (uint256 ethPrice, uint256 ethLastUpdate) {
            console.log("ETHUSD:", ethPrice, "Last Update:", ethLastUpdate);
        } catch {
            console.log("ETHUSD: No price data");
        }
        console.log("");
        
        // Try to update price with first wallet
        uint256 privateKey = vm.envUint("PRIVATE_KEY_0");
        vm.startBroadcast(privateKey);
        
        console.log("Attempting to update BTCUSD price...");
        try oracle.updatePrice("BTCUSD", 105000 * 10**18) {
            console.log("Successfully updated BTCUSD price!");
        } catch Error(string memory reason) {
            console.log("Failed to update:", reason);
        } catch (bytes memory data) {
            console.log("Failed with low-level error");
            // Try to decode custom error
            if (data.length >= 4) {
                bytes4 selector;
                assembly {
                    selector := mload(add(data, 32))
                }
                if (selector == PriceOracleV2.UnauthorizedUpdater.selector) {
                    console.log("   UnauthorizedUpdater error");
                }
            }
        }
        
        vm.stopBroadcast();
    }
}