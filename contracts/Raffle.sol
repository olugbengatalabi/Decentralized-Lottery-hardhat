// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

error Raffle__NotEnoughEthEntered();

contract Raffle {
  // state variables
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;

  constructor(uint256 entranceFee) {
    i_entranceFee = entranceFee;
  }
  function enterRaffle() public payable returns () {
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughEthEntered();
    }
    s_players.push(payable(msg.sender));
    // had to typecase it to payable as message.sender isnt a payable address and the s_players array is payable.. 
  }
  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }
  function getPlayer(uint256 index) public view returns (address) {
    returns s_players[index];
  }
}

