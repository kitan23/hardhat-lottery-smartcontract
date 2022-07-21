// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "hardhat/console.sol";

// Enter lottery
// Pick random winner
// Winner to be selected every X minutes
// Chainlink oracle, random number generator

// VRF Subscription ID: 8695
error Raffle__NotEnoughETH();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    // State variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUMWORDS = 1;
    uint32 private immutable i_callBackGasLimit;

    // Lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private s_interval;

    //Events
    event RaffleEnter(address indexed player);

    event RequestRaffleWinner(uint256 indexed requestId);

    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 entranceFee,
        uint32 callBackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_entranceFee = entranceFee;
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_interval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETH();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function performUpkeep(
        bytes calldata /*performData*/
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callBackGasLimit,
            NUMWORDS
        );
        emit RequestRaffleWinner(requestId);
    }

    // CHeck upkeep function to check if it's time to select a new winner
    // condition to return true:
    // 1. Our time interval shoulda passed
    // 2. At least 1 player in the raffle
    // 3. Subsription is funded with LINK
    // 4. Lottery should be in open state

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData */
        )
    {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > s_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getNumWords() public pure returns (uint256) {
        return NUMWORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmation() public pure returns (uint16) {
        return REQUEST_CONFIRMATION;
    }

    function getInterval() public view returns (uint256) {
        return s_interval;
    }

    function getRaffleState() public view returns (uint256) {
        return uint256(s_raffleState);
    }
}
