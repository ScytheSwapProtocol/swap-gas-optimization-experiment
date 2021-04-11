import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ScytheSwap, IERC20 } from '../typechain'
import { deployScytheSwap } from "./util";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers, network } from 'hardhat'
import { BigNumber, utils, Signer } from "ethers";

chai.use(solidity)
const { expect } = chai

import * as _env from './constants';

// ================
// 

describe('ScytheSwap', () => {
    let scythe: ScytheSwap
    let defaultAccount: SignerWithAddress
    const USDTShark = "0x5754284f345afc66a98fbb0a0afe71e0f007b949" 
    const KYLShark = "0x162752f29ce20f8b501d5eab28ca2450648779f1"
    const USDTContractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"
    const KYLContractAddress = "0x67b6d479c7bb412c54e03dca8e1bc6740ce6b99c"
    let USDTAccount:Signer
    let KYLAccount:Signer
    let owner: SignerWithAddress
    let dealId:BigNumber

    before(async() => {
        [defaultAccount, owner] = await ethers.getSigners()

        scythe = await deployScytheSwap({
            deployer: owner
        })

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [USDTShark]})

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [KYLShark]})

        USDTAccount = await ethers.provider.getSigner(USDTShark)
        KYLAccount = await ethers.provider.getSigner(KYLShark)

        await defaultAccount.sendTransaction
        ({to: USDTShark,
          value: _env.OneEther.mul(100)})
        
        await defaultAccount.sendTransaction
        ({to: KYLShark,
          value: _env.OneEther.mul(100)})
        
    })

    it('allows to create a trade', async () => {
        let kylAddr = await KYLAccount.getAddress()

        // approve to spend
        let usdt = await ethers
            .getContractAt("IERC20", USDTContractAddress)

        let tx = await usdt.connect(USDTAccount)
            .approve(scythe.address, 10000)

        const resolved = await tx.wait()
        const args = resolved.events?.[0]?.args

        expect(args.value).to.equal(10000)
        expect(args.owner.toLowerCase())
            .to.equal(USDTShark.toLowerCase())
        expect(args.spender.toLowerCase())
            .to.equal(scythe.address.toLowerCase())
        
        let txDeal =
            await scythe.connect(USDTAccount)
            .initiate(
                USDTContractAddress,
                10000,
                KYLContractAddress,
                10001,
                kylAddr
            )
        
        dealId = (await txDeal.wait()).events?.[0]?.args?.dealId
    })

    it('allows to challenge', async () => {
        let fee = await scythe.connect(USDTAccount).getTreasuryFee()

        // approve to spend
        let kyl = await ethers
            .getContractAt("IERC20", KYLContractAddress)

        let tx = await kyl.connect(KYLAccount)
            .approve(scythe.address, 10001)

        const resolved = await tx.wait()
        const args = resolved.events?.[0]?.args

        expect(args.value).to.equal(10001)
        expect(args.owner.toLowerCase())
            .to.equal(KYLShark.toLowerCase())
        expect(args.spender.toLowerCase())
            .to.equal(scythe.address.toLowerCase())
        
        await scythe.connect(KYLAccount)
            .challenge(dealId, {value: fee})
    })

    it('reduces fucking gas on repeat txs', async() => {
        let runs:number = 100
        let i:number

        for (i = 0; i < runs; i++) {
        
        let kylAddr = await KYLAccount.getAddress()

        // approve to spend
        let usdt = await ethers
            .getContractAt("IERC20", USDTContractAddress)

        let tx = await usdt.connect(USDTAccount)
            .approve(scythe.address, 10000)

        let txDeal =
            await scythe.connect(USDTAccount)
            .initiate(
                USDTContractAddress,
                10000,
                KYLContractAddress,
                10001,
                kylAddr
            )
        
        dealId = (await txDeal.wait()).events?.[0]?.args?.dealId

        let fee = await scythe.connect(USDTAccount).getTreasuryFee()

        // approve to spend
        let kyl = await ethers
            .getContractAt("IERC20", KYLContractAddress)

        await kyl.connect(KYLAccount)
            .approve(scythe.address, 10001)

        await scythe.connect(KYLAccount)
                .challenge(dealId, {value: fee})
        }
    })    
})
