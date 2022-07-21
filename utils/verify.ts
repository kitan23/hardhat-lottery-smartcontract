import { run } from "hardhat";
import { Address } from "hardhat-deploy/types";

export const verify = async (contractAddress: Address, args: Address[]) => {
    console.log("Verifying contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Already verified");
        } else {
            console.log(error);
        }
    }
};
