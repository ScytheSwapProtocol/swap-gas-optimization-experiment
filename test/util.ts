import { ethers } from "hardhat";
import { ScytheSwap, ScytheSwap__factory } from "../typechain";
import { BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

interface ScytheSwapDeployProps {
    deployer: SignerWithAddress;
}

export const deployScytheSwap =
    async (deployProps: ScytheSwapDeployProps): Promise<ScytheSwap> => {
        const ssFactory =
              (await ethers.getContractFactory('ScytheSwap', deployProps.deployer)) as ScytheSwap__factory
        
        const scythe = await ssFactory.deploy()

        await scythe.deployed()

        return scythe
    }
