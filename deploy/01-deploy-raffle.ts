import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
import { verify } from "../utils/verify";
// import { vrfCoordinatorV2Mock } from "../";

const VRF_FUND_AMOUNT = "1000000000000000000000";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network } = hre;
    const { deploy, log } = deployments;
    const chainId = network.config.chainId!;
    const { deployer } = await getNamedAccounts();

    let vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

        //get subscription id
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId.toString();

        //   console.log(subscriptionId.toString());

        //fund subscription
        //need the link token on a real network
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    const waitBlockConfirmation = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    const args: any[] = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        entranceFee,
        callBackGasLimit,
        interval,
    ];
    //  console.log(args);

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmation,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying.....");
        await verify(raffle.address, args);
        log("__________________________________________________");
    }
};

export default func;
func.tags = ["all", "raffle"];
