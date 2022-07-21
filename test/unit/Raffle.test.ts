import { ethers } from "hardhat";
import { deployments, network } from "hardhat";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "@ethersproject/bignumber";
import { assert, expect } from "chai";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle: Raffle;
          let raffleContract: Raffle;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let raffleEntranceFee: BigNumber;
          let interval: BigNumber;
          let player: SignerWithAddress;
          let accounts: SignerWithAddress[];
          const chainId = network.config.chainId;
          beforeEach(async () => {
              accounts = await ethers.getSigners();
              player = accounts[1];
              await deployments.fixture(["all"]);
              raffleContract = await ethers.getContract("Raffle");
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
              raffle = await raffleContract.connect(player);
              interval = await raffle.getInterval();
              raffleEntranceFee = await raffle.getEntranceFee();
          });

          describe("constructor", function () {
              //Ideally it would be best to separate each arguments in a different it
              it("Deploy Raffle with correct constructors", async function () {
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(interval.toString(), networkConfig[chainId!]["interval"]);
                  assert.equal(
                      raffleEntranceFee.toString(),
                      networkConfig[chainId!]["entranceFee"]
                  );
                  assert.equal(raffleState.toString(), "0");
              });
          });

          describe("enterRaffle", function () {
              it("Revert if not enough fund", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETH");
              });
              it("Record players when they enter", async function () {
                  await raffle.enterRaffle({
                      value: raffleEntranceFee,
                  });
                  const contractPlayer = await raffle.getPlayers(0);
                  assert.equal(contractPlayer, player.address);
              });
              it("Emit event on enter", async function () {
                  expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  );
              });
              it("Doesn't allow entrance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  );
              });
          });

          describe("checkUpkeep", async function () {
              it("Returns false if people haven't sent ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });
              it("Returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.checkUpkeep([]);
                  assert.equal(raffleState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("it can only run if upkeepNeeded is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const tx = await raffle.performUpkeep("0x");
                  assert(tx);
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  );
              });
              it("reverts if checkup is false", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });
              it("update the raffle state and emits a request", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const txResponse = await raffle.performUpkeep("0x");
                  const txReceipt = await txResponse.wait(1);
                  const raffleState = await raffle.getRaffleState();
                  const requestId = await txReceipt!.events![1].args?.requestId;
                  assert.equal(raffleState.toString(), "1");
                  assert(requestId > 0);
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
              });
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("pick a winner, reset the lottery, and send the money", async function () {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 2;
                  for (
                      let i = startingAccountIndex;
                      i < additionalEntrants + startingAccountIndex;
                      i++
                  ) {
                      const accountConnectedRaffle = await raffle.connect(accounts[i]);
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp();
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked Event Fired");
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerBalance = await accounts[2].getBalance();
                              const endingTimeStamp = await raffle.getLatestTimeStamp();
                              const numPlayers = await raffle.getNumberOfPlayers();
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(recentWinner, accounts[2].address);
                              assert.equal(raffleState.toNumber(), 0);
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              );

                              resolve();
                          } catch (error) {
                              reject(error);
                          }
                      });
                      // setting up the listener
                      // fire the event below, and the listener will pick up and resolve
                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const startingBalance = await accounts[2].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
