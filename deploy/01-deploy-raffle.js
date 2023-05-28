const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const {verify} = require('../helper-hardhat-config');


module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId
    let VRFCoordinatorV2Mock
    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")
    console.log(network.name)
    if (developmentChains.includes(network.name)) {
        console.log("we're in a development chain")
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = VRFCoordinatorV2Mock.address
        // creating a subscription id from the mock VRF contract
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReciept = await transactionResponse.wait(1)
        subscriptionId = transactionReciept.events[0].args.subId
        // funding the subscription
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
        // this process could be done a test =net and live network but na
    } else {
        console.log("we're not on a development chain")
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const entrance_fee = networkConfig[chainId]["entrance_fee"]
    gasLane = networkConfig[chainId]["gasLane"]
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        interval,
        entrance_fee,
        callBackGasLimit,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmation || 1,
    })
    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }
    if (!developmentChains.includes(network.name) && process.env.EHERSCAN_API_KEY) {
        log("verifying")
        await verify(raffle.address, args)
        log(".......................................................done")
    }
}
module.exports.tags = ["all", "raffle"]