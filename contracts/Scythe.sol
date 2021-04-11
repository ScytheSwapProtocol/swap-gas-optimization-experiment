// // SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// note: USDT fails to return a boolean value, as in
// it doesn't follow the ERC20 specification
interface IUSDT {
    function transferFrom(address _from, address _to, uint _value) external;
}

contract ScytheSwap {
    event DealCreated(uint256 indexed dealId);
    event DealClosed(uint256 indexed dealId);
    
    mapping (uint256 => uint256) private _deals;
    
    mapping (uint32 => address) private _partiesToAddresses;
    mapping (address => uint32) private _addressesToParties;
    mapping (uint32 => address) private _contractsToAddresses;
    mapping (address => uint32) private _addressesToContracts;
 
    uint256 private _dealCounter = 1;
    uint32 private _contractCounter = 1;
    uint32 private _partyCounter = 1;
    
    constructor() {
    }

    function getTreasuryFee() public pure returns (uint256) {
        return 1 ether / 20; // 0.05
    }

    function partyRegister(address party) internal returns (uint32) {
        if (_addressesToParties[party] > 0)
            return _addressesToParties[party];

        _addressesToParties[party] = _partyCounter;
        
        _partiesToAddresses[_partyCounter] = party;

        _partyCounter++;

        return (_partyCounter - 1);
    }

    function contractRegister(address contract_) internal returns (uint32) {
        if (_addressesToContracts[contract_] > 0)
            return _addressesToContracts[contract_];

        _addressesToContracts[contract_] = _contractCounter;

        _contractsToAddresses[_contractCounter] = contract_;

        _contractCounter++;

        return (_contractCounter - 1);
    }
    
    function initiate(address depositContract,
                      uint256 depositAmount,
                      address challengeContract,
                      uint256 challengeAmount,
                      address counterparty) public payable
        returns (uint256 dealId)
    {
        require(depositAmount < (2**32 - 1), "Deposit Amount Overflow");
        require(challengeAmount < (2**32 - 1), "Challenge Amount Overflow");
        
        uint32 initiator = partyRegister(msg.sender);
        uint32 challenger = partyRegister(counterparty);
        uint32 contract1 = contractRegister(depositContract);
        uint32 contract2 = contractRegister(challengeContract);

        uint256 deal = uint256(initiator);
        deal = deal << 32;
        deal |= contract1;
        deal = deal << 32;
        deal |= depositAmount;
        deal = deal << 32;
        deal |= challenger;
        deal = deal << 32;
        deal |= contract2;
        deal = deal << 32;
        deal |= challengeAmount;
        deal = deal << 32;
        
        _deals[_dealCounter] = deal;

        _dealCounter++;

        emit DealCreated(_dealCounter - 1);

        return (_dealCounter - 1);
    }

    function _dealTraits(uint256 deal)
        private
        view
        returns (address, address, address, address, uint256, uint256)
    {
        // initiator, contract1, depositAmount,
        // challenger, contract2, challengeAmount
        //deal >> 160, // initiator
        //deal << 64 >> 224, // contract1
        //deal << 96 >> 224, // depositAmount
        //deal << 128 >> 224, // challenger
        //deal << 160 >> 224, // contract2
        //deal << 192 >> 224, // challengeAmount
        

        // return order: initiator, challenger, contract1, contract2,
        // depositAmount, challengeAmount

        return (_partiesToAddresses[uint32(deal >> 160)],
                _partiesToAddresses[uint32(deal << 128 >> 224)],
                _contractsToAddresses[uint32(deal << 64 >> 224)],
                _contractsToAddresses[uint32(deal << 160 >> 224)],
                deal << 96 >> 224,
                deal << 192 >> 224);
    }

    
    function challenge(uint256 deal) public payable {
        require(_deals[deal] > 0, "Non-Existent Trade");
        (address initiator, address challenger,
         address contract1, address contract2,
         uint256 asset1, uint256 asset2) = _dealTraits(_deals[deal]);
        
        require(challenger == msg.sender, "Not the counterparty");
        require(msg.value == getTreasuryFee(), "ETH fee sent too low");
        require(IERC20(contract1)
                .allowance(initiator, address(this))
                == asset1,
                "Initiator allowance mismatch");
        
        require(IERC20(contract2)
                .allowance(challenger, address(this))
                == asset2,
                "Challenger allowance mismatch");
       

        IUSDT(contract1).transferFrom(initiator,
                                      challenger,
                                      asset1);
        
        IERC20(contract2).transferFrom(challenger,
                                       initiator,
                                       asset2);
        
        delete _deals[deal];

        emit DealClosed(deal);
    }
    
}
