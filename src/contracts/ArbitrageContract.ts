import { BigNumberish, Signer } from "ethers";
import { ABI } from "../utils/constants";
import { MyBaseContract } from "./MyBaseContract";
import { Logger } from "@nestjs/common";
import { Babylonian } from "../arbitrage/solidityConvert/Babylonian";
import { RouterV2Contract } from "./RouterV2Contract";
import { SwapArgs } from "../dto";

export class ArbitrageContract extends MyBaseContract {
  private readonly logger: Logger = new Logger(ArbitrageContract.name);

  constructor(address: string, signer: Signer) {
    super(address, ABI.arbitrage, signer);
  }

  async getMaxProfitData({ router, tokenA, tokenB, truePriceTokenA, truePriceTokenB, maxSpendTokenA, maxSpendTokenB }) {
    const from = Date.now();
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const maximizedProfit = await this.instance.getFunction("getMaximizedProfit").staticCallResult(
        router,
        tokenA,
        tokenB,
        truePriceTokenA,
        truePriceTokenB,
        maxSpendTokenA,
        maxSpendTokenB
      );
      Logger.debug(`end at ${Date.now() - from}`, "getMaxProfitData");

      return maximizedProfit;
    } catch (e) {
      return undefined;
    }
  }

  getExpectedAmountOffChain(routers: { router: RouterV2Contract, reserves: Map<string, bigint> }[], path: string[], amountIn: bigint): bigint {
    const amountsOutMiddle = routers[0].router.getAmountsOutOffChain(routers[0].reserves, [path[0], path[1]], amountIn);
    const amountsOutProfit = routers[1].router.getAmountsOutOffChain(routers[1].reserves, [path[1], path[2]], amountsOutMiddle[1]);

    return amountsOutProfit[1];
  }

  computeProfitMaximizingTrade(
    truePriceTokenA: bigint,
    truePriceTokenB: bigint,
    reserveA: bigint,
    reserveB: bigint
  ): [boolean, bigint] {
    const aToB = reserveA * truePriceTokenB < reserveB * truePriceTokenA;

    const invariant = reserveA * reserveB;

    const leftSide = Babylonian.sqrt(
      invariant * BigInt(1000) *
      (aToB ? truePriceTokenA : truePriceTokenB) /
      ((aToB ? truePriceTokenB : truePriceTokenA) * BigInt(997))
    );
    const rightSide = (aToB ? reserveA : reserveB) * BigInt(1000) / BigInt(997);

    if (leftSide < rightSide) return [false, BigInt(0)];

    // compute the amount that must be sent to move the price to the profit-maximizing price
    const amountIn = leftSide - rightSide;
    return [aToB, amountIn];
  }

  getMaxProfitDataOfChain(
    router: string,
    tokenA: string,
    tokenB: string,
    reserveARouterOut: bigint,
    reserveBRouterOut: bigint,
    reserveARouterIn: bigint,
    reserveBRouterIn: bigint
  ) {
    const from = Date.now();
    try {
      const [aToB, amountIn] = this.computeProfitMaximizingTrade(reserveARouterOut, reserveBRouterOut, reserveARouterIn, reserveBRouterIn);

      return {
        amountIn,
        path: aToB ? [tokenA, tokenB] : [tokenB, tokenA]
      };

    } catch (e) {
      return undefined;
    } finally {
      Logger.debug(`end at ${Date.now() - from}`, "getMaxProfitDataOfChain");
    }
  }

  async getMaxProfitDataStatic({
                                 router,
                                 tokenA,
                                 tokenB,
                                 truePriceTokenA,
                                 truePriceTokenB,
                                 maxSpendTokenA,
                                 maxSpendTokenB
                               }) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.instance.getMaximizedProfit.staticCallResult(
      router,
      tokenA,
      tokenB,
      truePriceTokenA,
      truePriceTokenB,
      maxSpendTokenA,
      maxSpendTokenB
    );
  }

  async swap(swapArgs: SwapArgs, debugLevel = "safeSwap") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return await this.instance.getFunction("safeSwap").send(swapArgs.routerIn, swapArgs.routerOut, swapArgs.fromToken, swapArgs.toToken, swapArgs.amountIn, swapArgs.feeData);
  }

  async swapStatic(swapArgs: SwapArgs) {
    const from = Date.now();
    const resultPromise = await this.instance.getFunction("safeSwap").staticCallResult(swapArgs.routerIn, swapArgs.routerOut, swapArgs.fromToken, swapArgs.toToken, swapArgs.amountIn);
    Logger.debug(`end at ${Date.now() - from}`, "swapStatic");
    return resultPromise;
  }

  async swapPopulate(swapArgs: SwapArgs) {
    const from = Date.now();
    const contractTransactionPromise = await this.instance.getFunction("safeSwap").populateTransaction(swapArgs.routerIn, swapArgs.routerOut, swapArgs.fromToken, swapArgs.toToken, swapArgs.amountIn, {
      ...swapArgs.feeData,
    });
    Logger.debug(`end at ${Date.now() - from}`, "swapPopulate");
    return contractTransactionPromise;
  }

  async estimateGas(swapArgs: SwapArgs) {
    const from = Date.now();
    const bigintPromise = await this.instance.getFunction("safeSwap").estimateGas(swapArgs.routerIn, swapArgs.routerOut, swapArgs.fromToken, swapArgs.toToken, swapArgs.amountIn, swapArgs.feeData);
    Logger.debug(`end at ${Date.now() - from}`, "estimateGas");
    return bigintPromise;
  }

  async getExpectedAmount(routerIn: string,
                          routerOut: string,
                          profitToken: string,
                          middleToken: string,
                          amountIn: BigNumberish) {
    const from = Date.now();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const expectedAmount = await this.instance.getExpectedAmount(routerIn, routerOut, profitToken, middleToken, amountIn);
    Logger.debug(`end at ${Date.now() - from}`, "getExpectedAmount");

    return expectedAmount;
  }

  async withdrawToken(token: string, address: string, amount: bigint, debugLevel = "withdrawToken") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const tx = await this.instance.getFunction("withdrawToken").send(token, address, amount);
    this.logger.log(tx, debugLevel);
    return tx.wait(1);
  }

}
