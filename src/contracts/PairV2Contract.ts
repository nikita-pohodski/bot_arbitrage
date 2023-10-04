import { ContractRunner } from "ethers";
import uniswapV2Pair from "../abi/uniswapV2/UniswapV2Pair.json";
import { MyBaseContract } from "./MyBaseContract";

export class PairV2Contract extends MyBaseContract {
  constructor(address: string, provider: ContractRunner) {
    super(address, uniswapV2Pair, provider);
  }

  private _token0: string;
  private _token1: string;
  private _reserves: Map<string, bigint>;

  public setToken0(token0: string) {
    this._token0 = token0;
  }

  public setToken1(token1: string) {
    this._token1 = token1;
  }

  public setReserves(tokenAddress: string, amount: bigint) {
    if (!this._reserves.has(tokenAddress)) {
      throw Error("Pair dont include that address");
    }

    this._reserves.set(tokenAddress, amount);
  }

  public getReserves() {
    return this._reserves;
  }

  public async loadReserves() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const reserves = await this._instance.getReserves();

    if (!this._reserves) {
      this._reserves = new Map();
    }

    this._reserves.set(this._token0, reserves[0]);
    this._reserves.set(this._token1, reserves[1]);
  }

  public async token0() {
    if (!this._token0) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const token0 = await this._instance.token0();
      this._token0 = token0.toLowerCase();
    }

    return this._token0;
  }

  public async token1() {
    if (!this._token1) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const token1 = await this._instance.token1();
      this._token1 = token1.toLowerCase();
    }

    return this._token1;
  }

  public getToken0() {
    return this._token0;
  }

  public getToken1() {
    return this._token1;
  }

  public static getPairContract(pairAddress, provider): PairV2Contract {
    return new PairV2Contract(pairAddress, provider);
  }
}
