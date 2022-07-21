import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PER_LINK = 1e9;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;

    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log("Local network detected. Deploying mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PER_LINK],
            log: true,
        });
        log("Mocks deployed.");
        log("__________________________________________________");
    }
};

export default func;
func.tags = ["all", "mock"];
