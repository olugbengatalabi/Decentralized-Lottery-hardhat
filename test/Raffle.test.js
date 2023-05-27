const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? descibe.skip
    : describe("Raffle", async () => {
          let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId
          beforeEach(async () => {
              ;({ deployer } = await getNamedAccounts())
              console.log(deployer)
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })
          describe("enterRaffle", async () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      // is reverted when not paid enough or raffle is not open
                      "Raffle__SendMoreToEnterRaffle"
                  )
              })
              it("records players when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits and event on enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesnt allow entrance when calculating", async () => {
                  // enter raffle and speed up the time interval needed to be able to perform upkeep
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  let raffleState = await raffle.getRaffleState()
                  console.log(raffleState)
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // await network.provider.request({method: "evm_mine", params: []})
                  // pretent to be chainlink keepers and call call perform upkeep

                  await raffle.performUpkeep([]) //passed in a empy call data
                  raffleState = await raffle.getRaffleState()
                  console.log(raffleState)
                  // await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                  //     "Raffle__RaffleNotOpen"
                  // )

                  // try {
                  //     await raffle.enterRaffle({ value: raffleEntranceFee })
                  // } catch (error) {
                  //     console.log(error)
                  // }
                  try {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                  } catch (error) {
                      console.log("Actual revert reason:", error.message)
                  }

                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__RaffleNotOpen"
                  )
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people havent sent any eth", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  console.log("THis is the rafflestate " + raffleState)
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  console.log("IS UPKEEP NEEDED?" + upkeepNeeded)
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("it can only run if checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })
              it("reverts when checkUpkeep is false", async () => {
                  expect(raffle.performUpkeep([]).to.be.revertedWith("Raffle__UpkeepNotNeeded"))
              })
              it("updates the rafflestate, emits an event and calls the vrf cordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReciept = await txResponse.wait(1)
                  const requestId = txReciept.events[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  console.log(raffleState)
                  assert(requestId.toNumber() > 0)
                  assert(raffleState.toString() == "1")
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpKeep", async () => {
                  expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
                  expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets the lottery, and sends money", async () => {
                  const accounts = await ethers.getSigners() 
                  const additionalEntrance = 3
                  const staertingAccountIndex = 1 // deplotyer = 0
                  for (
                      let index = staertingAccountIndex;
                      index < staertingAccountIndex + additionalEntrance;
                      index++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[index])
                      await accountConnectedRaffle.enterRaffle({value: raffleEntranceFee})
                  }
                  const startingTimeStamp  = await raffle.getLastTimeStamp()
              })
          })
      })
