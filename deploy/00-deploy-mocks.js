const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25")
// chainlink vrfcoordinator takes a base fee in link, this value is passed in as a constructor argument... i.e it cost 0.25 link per request

const GAS_PRICE_LINK = 1e9
module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log("step one function called")
    const { deploy, log } = deployments
    console.log("step 2 function called")

    const { deployer } = await getNamedAccounts()
    console.log("step 3 function called")

    const chainId = network.config.chainId
    console.log("step 3 function called")

    const args = [BASE_FEE, GAS_PRICE_LINK]
    if (developmentChains.includes(network.name)) {
        console.log("step 4 function called")

        console.log(`local network detected, deploying mocks to  ${network.name}`)
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("mocks deployed")
        log("----------------------00------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
