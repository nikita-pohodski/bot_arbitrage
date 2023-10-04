import { Signer } from "ethers";
import uniswapV2ERC20Abi from "../abi/uniswapV2/UniswapV2ERC20.json";
import { MyBaseContract } from "./MyBaseContract";
import { Logger } from "@nestjs/common";
import { Payable } from "../dto";

export class ERC20TokenContract extends MyBaseContract {

  constructor(address: string, signer: Signer) {
    super(address, uniswapV2ERC20Abi, signer);
  }

  public async balanceOf(address: string) {
    const from = Date.now();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const balanceOf = await this._instance.balanceOf(address);
    Logger.debug(`end at ${Date.now() - from}`, "balanceOf");
    return balanceOf;
  }

  public async allowance(signer: string, spender: string) {
    const from = Date.now();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const allowance = await this._instance.allowance(signer, spender);
    Logger.debug(`end at ${Date.now() - from}`, "allowance");

    return allowance;
  }

  public async approve(spender: string, amount: bigint) {
    const from = Date.now();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contractTransactionResponsePromise = await this._instance.getFunction("approve").send(spender, amount);

    Logger.debug(`end at ${Date.now() - from}`, "approve");
    return contractTransactionResponsePromise;
  }

  public connect(signer: Payable) {
    return new ERC20TokenContract(this.address, signer.instance);
  }
}
