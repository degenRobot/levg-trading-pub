// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/PriceOracleV2.sol";

contract CheckOracleScript is Script {
    function run() external view {
        address oracleAddress = 0x47c05BCCA7d57c87083EB4e586007530eE4539e9;
        PriceOracleV2 oracle = PriceOracleV2(oracleAddress);
        
        console.log("=== Oracle Price Check ===");
        
        // Check BTCUSD
        try oracle.getLatestPrice("BTCUSD") returns (uint256 btcPrice, uint256 btcLastUpdate) {
            console.log("BTCUSD Price:", btcPrice / 1e18, "USD");
            console.log("BTCUSD Raw:", btcPrice);
            console.log("Last Update:", btcLastUpdate);
        } catch {
            console.log("BTCUSD: No price data");
        }
        
        // Check ETHUSD
        try oracle.getLatestPrice("ETHUSD") returns (uint256 ethPrice, uint256 ethLastUpdate) {
            console.log("\nETHUSD Price:", ethPrice / 1e18, "USD");
            console.log("ETHUSD Raw:", ethPrice);
            console.log("Last Update:", ethLastUpdate);
        } catch {
            console.log("\nETHUSD: No price data");
        }
        
        // Check feed IDs our oracle is sending
        console.log("\n=== Expected Feed IDs ===");
        console.log("BTCUSD (from oracle)");
        console.log("ETHUSD (from oracle)");
    }
}