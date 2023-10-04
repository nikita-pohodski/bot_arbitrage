import uniswapV2RouterABI from "../abi/uniswapV2/UniswapV2Router.abi.json";
import { BigNumberish, parseUnits, Signer, toBigInt, TransactionRequest } from "ethers";
import { ERC20TokenContract } from "./ERC20TokenContract";
import { MyRpcProvider } from "../services/MyRpcProvider";
import { MyBaseContract } from "./MyBaseContract";
import { Logger } from "@nestjs/common";
import { PairSwapDTO, Payable } from "../dto";
import { PairV2Contract } from "./PairV2Contract";


export type PreSwapDto = { log: PairSwapDTO, populate: TransactionRequest, swapData: SwapData };

export type SwapData = { path: string[], gas: any, amountIn: bigint, amountOut: bigint, to: string, deadline: number };

export class RouterV2Contract extends MyBaseContract {
  private readonly _signer: Signer;
  private readonly _config: any;
  readonly #alias: any;
  private readonly logger: Logger;

  constructor(address: string, signer: Signer, config, alias: string) {
    super(address, uniswapV2RouterABI, signer);
    this._signer = signer;
    this._config = config;
    this.#alias = alias;
    this.logger = new Logger(RouterV2Contract.name);
  }

  connect(signer: Payable) {
    return new RouterV2Contract(this.address, signer.instance, this._config, this.#alias);
  }

  async getAmountsOut(token0: string, token1: string, amount: bigint): Promise<bigint[]> {
    const result = await this.instance.getFunction("getAmountsOut").staticCallResult(amount, [token0, token1]);
    return result[0];
  }

  getAmountsOutOffChain(reserves: Map<string, bigint>, path: string[], amountIn: bigint): bigint[] {
    const amounts = new Array<bigint>(path.length);

    amounts[0] = amountIn;
    for (let i = 0; i < path.length - 1; i++) {
      amounts[i + 1] = this.getAmountOut(amounts[i], reserves.get(path[0]), reserves.get(path[1]));
    }
    return amounts;
  }

  private getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
    const feeInAmountOut = this._config[this.#alias].feeInAmountOut;
    const mulNumber = this._config[this.#alias].mulNumber;

    const amountInWithFee = amountIn * BigInt(feeInAmountOut);
    const numerator = amountInWithFee * reserveOut;
    const denominator = (reserveIn * BigInt(mulNumber)) + amountInWithFee;
    return numerator / denominator;
  }

  async swapTokenToToken(from: ERC20TokenContract, to: ERC20TokenContract, amountIn: BigNumberish, provider: MyRpcProvider) {
    const fromAddress = from.address;
    const toAddress = to.address;
    const signer = await this._signer.getAddress();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const [amountsOut, feeData, gasPrices, allowance] = await Promise.all([
      this.instance.getAmountsOut(amountIn, [fromAddress, toAddress]),
      provider.instance.getFeeData(),
      provider.oracle.gasPrices(),
      from.allowance(signer, this.address)
    ]);

    this.logger.log(gasPrices);

    if (allowance < amountIn) {
      this.logger.log(`Need to approve`);
      const approveTransaction = await from.approve(this.address, toBigInt(amountIn) * toBigInt(10));
      const receipt = await approveTransaction.wait(1);
      this.logger.log(`Successfully approved. Receipt:${this._config.scanUrl + receipt.hash}`);
    }

    try {
      const gas = {
        ...feeData,
        gasPrice: parseUnits(String(11.25445), "gwei"),
        // gasPrice: parseUnits(String((<GasPrice>gasPrices).standard), "gwei"),
        gasLimit: 1000000
      };

      const swapTransaction = await this.instance.getFunction("swapExactTokensForTokensSupportingFeeOnTransferTokens").send(
        amountIn,
        amountsOut[1] * toBigInt("98") / toBigInt("100"),
        [fromAddress, toAddress],
        this.address,
        Date.now() + 1000 * 60 * 10,
        gas
      );

      this.logger.log(`Pending transaction: ${this._config.scanUrl + swapTransaction.hash}`);

      const contractTransactionReceipt = await swapTransaction.wait(1);

      this.logger.log(`Receipt: ${this._config.scanUrl + contractTransactionReceipt.hash}`);
    } catch (e) {
      console.log(e);
    }
  }

  async swapTokenToTokenPopulate(args: {
    from: ERC20TokenContract,
    to: ERC20TokenContract,
    amountIn: bigint,
    provider: MyRpcProvider,
    signer: Payable,
    pairReserves: Map<string, bigint>,
    pair: PairV2Contract,
  }): Promise<PreSwapDto> {
    const { from, amountIn, to, provider, signer, pairReserves } = args;

    const path = [from.address, to.address];
    const amountsOut = this.getAmountsOutOffChain(pairReserves, path, amountIn);
    const [feeData, gasPrices, allowance] = await Promise.all([
      provider.instance.getFeeData(),
      provider.gasPrices(),
      from.allowance(signer.address, this.address)
    ]);

    this.logger.log(gasPrices);

    if (allowance < amountIn) {
      this.logger.log(`Need to approve`);
      const approveTransaction = await from.connect(signer).approve(this.address, amountIn * BigInt(10));
      const receipt = await approveTransaction.wait(1);
      this.logger.log(`Successfully approved. Receipt:${this._config.scanUrl + receipt.hash}`);
    }

    try {
      const gas: { gasPrice: bigint, gasLimit: number } = {
        ...feeData,
        gasPrice: parseUnits(String(3), "gwei"),
        gasLimit: 200000
      };

      const swapData: SwapData = {
        amountIn,
        amountOut: amountsOut[1] * BigInt(98) / BigInt(100),
        path: path,
        to: signer.address,
        deadline: Date.now() + 1000 * 60 * 10,
        gas
      };


      const swapTransaction = await this.instance.connect(signer.instance).getFunction("swapExactTokensForTokens").populateTransaction(
        swapData.amountIn,
        swapData.amountOut,
        swapData.path,
        swapData.to,
        swapData.deadline,
        swapData.gas
      );

      const token0 = args.pair.getToken0();
      const token1 = args.pair.getToken1();

      return {
        populate: swapTransaction,
        swapData,
        log: {
          address: args.pair.address,
          amount0In: path[0].toLowerCase() === token0.toLowerCase() ? swapData.amountIn : BigInt(0),
          amount0Out: path[1].toLowerCase() === token0.toLowerCase() ? swapData.amountOut : BigInt(0),
          amount1In: path[0].toLowerCase() === token1.toLowerCase() ? swapData.amountIn : BigInt(0),
          amount1Out: path[1].toLowerCase() === token1.toLowerCase() ? swapData.amountOut : BigInt(0),
          to: this.address,
          sender: signer.address
        }
      };
    } catch (e) {
      console.log(e);
    }
  }
}
