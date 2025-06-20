// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/PriceOracleV2.sol";

contract AuthorizeOracleUpdaters is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Oracle address from recent deployment
        address oracleAddress = 0x47c05BCCA7d57c87083EB4e586007530eE4539e9;
        
        vm.startBroadcast(deployerPrivateKey);
        
        PriceOracleV2 oracle = PriceOracleV2(oracleAddress);
        
        // Authorize the oracle updater addresses from backend .env
        address[3] memory updaters = [
            0x48834c814E9d7869EE8e1059bd4B9B27b3b1910F,  // From PRIVATE_KEY_0
            0xE504fF4631e564DbC168a34C9d195FfEA988C622,  // From PRIVATE_KEY_1
            0x7AdFc5772300A55EC2C7506ca27CfB3e3BFa05Ea   // From PRIVATE_KEY_2
        ];
        
        for (uint i = 0; i < updaters.length; i++) {
            if (!oracle.authorizedUpdaters(updaters[i])) {
                oracle.setAuthorizedUpdater(updaters[i], true);
                console.log("Authorized oracle updater:", updaters[i]);
            } else {
                console.log("Already authorized:", updaters[i]);
            }
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Oracle Updaters Status ===");
        for (uint i = 0; i < updaters.length; i++) {
            bool isAuthorized = oracle.authorizedUpdaters(updaters[i]);
            console.log(updaters[i], "authorized:", isAuthorized);
        }
    }
}