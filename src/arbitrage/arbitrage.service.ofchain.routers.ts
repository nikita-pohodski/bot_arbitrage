import { Injectable, Logger } from "@nestjs/common";
import {
  BigNumberish,
  ContractTransaction,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  resolveProperties,
  Signer,
  toBigInt,
  Transaction,
  TransactionRequest,
  TransactionResponse
} from "ethers";
import {
  ArbitrageWallet,
  ERC20TokenContract,
  MulticallContract,
  MyWebSocketProvider,
  RouterV2Contract
} from "../contracts";
import { AllBestProfitDataArgs, BestProfitData, DexArbitrageData, RouterData, SwapArgs, TokenData } from "../dto";
import { ArbitrageConfig } from "../config/ArbitrageConfig";
import { ArbitrageContract } from "../contracts/ArbitrageContract";
import { TransactionFee } from "./interfaces/arbitrage.service.interface";
import { ArbitrageServiceRoutersInterface } from "./interfaces/arbitrage.service.routers.interface";
import { Networks } from "../utils/constants";
import { ContractFabric } from "../fabrics/ContractFabric";

@Injectable()
export class ArbitrageServiceOfChainRouters implements ArbitrageServiceRoutersInterface {
  constructor(
    private readonly configuration: ArbitrageConfig,
    private readonly logger: Logger,
    private readonly multicall: MulticallContract,
    private readonly contractFabric: ContractFabric
  ) {
  }

  private nonce: number;
  private blockTag;
  private gasLimit: number;

  public async loadNonceAndBlockTag(network: Networks) {
    const arbitrageWallet = new ArbitrageWallet(this.configuration.configuration.pk, this.contractFabric.CONFIG[network].providers.wss);
    const provider = this.contractFabric.CONFIG[network].providers.wss;

    const result = await this.multicall.aggregatePromises([
      arbitrageWallet.instance.getNonce(),
      provider.instance._getBlockTag()
    ]);

    this.nonce = result[0];
    this.blockTag = String(result[1]);
    this.gasLimit = this.contractFabric.CONFIG[network].gasLimit;
  }

  public async crossDexArbitrage(debugLabel: string,
                                 routers: RouterData[],
                                 pairData: TokenData[],
                                 balances: Map<string, bigint>,
                                 pairReserves: Map<string, Map<string, bigint>>,
                                 arbitrageContract: ArbitrageContract,
                                 network: Networks) {
    // const from = Date.now();
    this.getCrossDexArbitrageData(debugLabel, routers, pairData, balances, pairReserves, arbitrageContract, network)
      .then(crossArbitrageData => {
        if (!!crossArbitrageData) {
          const provider: MyWebSocketProvider = this.contractFabric.CONFIG[network].providers.wss;
          const arbitrageWallet: ArbitrageWallet = new ArbitrageWallet(this.configuration.configuration.pk, provider);

          const sendTxStartAt = Date.now();

          this.getWrapTransaction(crossArbitrageData, arbitrageWallet, network)
            .then(wrapTransaction => {
              const transactionResponsePromise = this.sendTransaction(arbitrageWallet, provider, wrapTransaction);

              this.nonce = this.nonce + 1;

              transactionResponsePromise
                .then(receipt => {
                  this.logger.log(`TX hash = ${this.configuration.configuration.dex_constants[network].scanUrl}${receipt.hash} at ${Date.now() - sendTxStartAt} ms`, debugLabel);
                  receipt.wait()
                    .then(value => {
                      this.logger.log(`Transaction status = ${value.status === 0 ? "revert" : "success"}, gasUsed = ${value.gasUsed}, blockNumber = ${value.blockNumber}`, debugLabel);
                    })
                    .catch(reason => {
                      this.logger.error(`Transaction was reverted. Reason: ${reason}`, reason, debugLabel);
                    });
                })
                .catch(reason => {
                  this.logger.error(`crossDexArbitrage: transactionResponsePromise: Error: ${reason}`, reason?.stack, debugLabel);
                });
            })
            .catch(reason => {
              this.logger.error(`crossDexArbitrage: getWrapTransaction: Error: ${reason}`, reason?.stack, debugLabel);
            });
        }
      })
      .catch(reason => {
        this.logger.error(`crossDexArbitrage: getCrossDexArbitrageData: Error: ${reason}`, reason?.stack, debugLabel);
      });
    //
    // try {
    //   const [crossArbitrageData]: [DexArbitrageData] = await Promise.all([
    //     this.getCrossDexArbitrageData(debugLabel, routers, pairData, balances, pairReserves, arbitrageContract, network)
    //   ]);
    //
    //   if (!!crossArbitrageData) {
    //     const provider: MyWebSocketProvider = this.contractFabric.CONFIG[network].providers.wss;
    //     const arbitrageWallet: ArbitrageWallet = new ArbitrageWallet(this.configuration.configuration.pk, provider);
    //
    //
    //     const sendTxStartAt = Date.now();
    //     const wrapTransaction = this.getWrapTransaction(crossArbitrageData, arbitrageWallet, network);
    //     const transactionResponsePromise = this.sendTransaction(arbitrageWallet, provider, wrapTransaction);
    //
    //     this.nonce = this.nonce + 1;
    //
    //     const receipt = await transactionResponsePromise;
    //     this.logger.log(`TX hash = ${this.configuration.configuration.dex_constants[network].scanUrl}${receipt.hash} at ${Date.now() - sendTxStartAt} ms`, debugLabel);
    //
    //     receipt.wait()
    //       .then(value => {
    //         this.logger.log(`Transaction status = ${value.status === 0 ? "revert" : "success"}, gasUsed = ${value.gasUsed}, blockNumber = ${value.blockNumber}`, debugLabel);
    //       })
    //       .catch(reason => {
    //         this.logger.error(`Transaction was reverted. Reason: ${reason}`, reason, debugLabel);
    //       });
    //   }
    // } catch (e) {
    //   this.logger.error(`crossDexArbitrage: Error: ${e}`, e?.stack, debugLabel);
    // } finally {
    //   this.logger.log(`crossDexArbitrage: end at ${Date.now() - from}`, debugLabel);
    // }
  }

  private async getWrapTransaction(crossArbitrageData: DexArbitrageData, arbitrageWallet: ArbitrageWallet, network: Networks) {
    const populateTransaction = crossArbitrageData.populateTransaction;
    const feeData = crossArbitrageData.swapData.feeData;
    const dexConstant = this.configuration.configuration.dex_constants[network];

    return {
      data: populateTransaction.data,
      to: populateTransaction.to,
      from: arbitrageWallet.address,
      gasPrice: feeData.gasPrice,
      gasLimit: feeData.gasLimit,
      nonce: this.nonce,
      chainId: dexConstant.network.rpc.id,
      blockTag: this.blockTag,
      value: BigInt(0),
      type: 0
    };
  }

  public async sendTransaction(signer: ArbitrageWallet, provider: MyWebSocketProvider, wrapTransaction: TransactionRequest): Promise<TransactionResponse> {
    const signedTransaction = await this.signTransaction(wrapTransaction, signer);

    return provider.instance.broadcastTransaction(signedTransaction);
  }

  public async signTransaction(wrapTransaction: TransactionRequest, signer: ArbitrageWallet) {
    const resolvedTransaction = await resolveProperties(wrapTransaction);

    delete resolvedTransaction.from;

    const transaction = Transaction.from((<Transaction>resolvedTransaction));

    return signer.instance.signTransaction(transaction);
  }

  public async getCrossDexArbitrageData(debugLabel: string,
                                        routers: RouterData[],
                                        pairData: TokenData[],
                                        balances: Map<string, bigint>,
                                        pairReserves: Map<string, Map<string, bigint>>,
                                        arbitrageContract: ArbitrageContract,
                                        network: Networks): Promise<DexArbitrageData> {
    const from = Date.now();

    try {
      const generalData = await this.getGeneralData(routers, pairData, pairReserves, network, debugLabel);
      const { profitToken, middleToken, reserves } = generalData;

      const rates = this.getRates(routers, reserves, middleToken, profitToken, debugLabel);

      const profitData = this.getAllBestProfitData({
          aToB: true,
          balances: balances,
          routers: this.getRoutersToCountBastProfit(routers, reserves, rates),
          tokenA: profitToken.contract.address,
          tokenB: middleToken.contract.address
        },
        arbitrageContract,
        debugLabel);

      if (!profitData || profitData.profitWETH <= BigInt(0)) {
        this.logger.warn(`arbitrageSwap: Not profitable transaction`, debugLabel);
        return;
      }

      const swapData: SwapArgs = {
        routerIn: profitData.routerIn,
        routerOut: profitData.routerOut,
        fromToken: profitData.path[0],
        toToken: profitData.path[1],
        amountIn: profitData.amountIn,
        feeData: {
          gasPrice: parseUnits(String(3), "gwei"),
          // gasPrice: parseUnits(String(generalData.gasPrices.my), "gwei"),
          gasLimit: BigInt(this.gasLimit)
        }
      };

      const minProfit = parseEther("0.0002");
      this.logger.debug(`arbitrageSwap: ${formatEther(profitData.profit)} ${profitToken.symbol} ${profitData.profit >= minProfit ? ">=" : "<"} ${formatEther(minProfit)} ${profitToken.symbol}`, debugLabel);

      if (profitData.profit >= minProfit) {
        return {
          populateTransaction: await arbitrageContract.swapPopulate(swapData),
          swapData,
          profitData,
          profitToken,
          middleToken
        };
      } else {
        this.logger.warn(`arbitrageSwap: Not profitable transaction`, debugLabel);
      }
    } catch (e) {
      this.logger.error(`arbitrageSwap: Error: ${e}`, e?.stack, debugLabel);
    } finally {
      this.logger.log(`arbitrageSwap: end at ${Date.now() - from}`, debugLabel);
    }
  }

  private getRoutersToCountBastProfit(routers: RouterData[], reserves: Map<string, Map<string, bigint>>, rates: Map<string, bigint>) {
    return routers.map(routerData => ({
      router: routerData,
      reserves: reserves.get(routerData.router.address),
      rateMiddleToProfit: rates.get(routerData.name)
    }));
  }

  private getRates(routers: RouterData[], reserves: Map<string, Map<string, bigint>>, middleToken: TokenData, profitToken: TokenData, debugLabel: string) {
    const rates = new Map<string, bigint>();

    routers.forEach(routerData => {
      const router = routerData.router;
      const rate = router.getAmountsOutOffChain(reserves.get(router.address), [middleToken.contract.address, profitToken.contract.address], parseEther("1"));
      this.logger.debug(`${routerData.name} router price = 1 ${middleToken.symbol} = ${formatEther(rate[1])} ${profitToken.symbol}`, debugLabel);
      // this.logger.debug(`${routerData.name} router price = 1312395769312 ${middleToken.symbol} = ${formatEther(rate[1] * BigInt(1312395769312))} ${profitToken.symbol}`, debugLabel);
      rates.set(router.address, rate[1]);
    });

    return rates;
  }

  private async getGeneralData(routers: RouterData[], pairData: TokenData[], pairReserves: Map<string, Map<string, bigint>>, network: Networks, debugLabel: string) {
    const reserves = new Map<string, Map<string, bigint>>();

    const tokenA = pairData[1];
    const tokenB = pairData[0];

    const [gasPrices] = await Promise.all([
      this.contractFabric.CONFIG[network].providers.rpc.gasPrices()
    ]);

    for (const routerData of routers) {
      reserves.set(routerData.router.address, pairReserves.get(routerData.pair.address));
    }

    return {
      gasPrices,
      profitToken: tokenA,
      middleToken: tokenB,
      reserves
    };
  }

  private getAllBestProfitData({
                                 balances,
                                 routers,
                                 tokenA,
                                 tokenB
                               }: AllBestProfitDataArgs, arbitrageContract: ArbitrageContract, debugLabel: string): BestProfitData {
    const from = Date.now();

    const map = new Map<string, BestProfitData>();
    const routersToCount: { router: RouterV2Contract; reserves: Map<string, bigint> }[][] = new Array<{ router: RouterV2Contract, reserves: Map<string, bigint> }[]>();

    for (let i = 0; i < routers.length; i++) {
      const routerA = routers[i];
      for (let j = 0; j < routers.length; j++) {
        const routerB = routers[j];
        if (i === j) continue;

        routersToCount.push([
          { router: routerA.router.router, reserves: routerA.reserves },
          { router: routerB.router.router, reserves: routerB.reserves }
        ]);

        const routerARouterBTokenATokenBID = this.getId(routerA.router.router.address, routerB.router.router.address, tokenA, tokenB);

        const bestProfitDataRouterAToRouterBTokenAToTokenB = {
          id: routerARouterBTokenATokenBID,
          routerIn: routerA.router.router.address,
          routerOut: routerB.router.router.address,
          routerInContract: routerA.router.router,
          routerOutContract: routerB.router.router,
          path: [tokenA, tokenB, tokenA],
          amountIn: BigInt(0),
          amountOut: BigInt(0),
          profit: BigInt(0),
          profitWETH: BigInt(0),
          lastProfit: undefined
        };

        map.set(bestProfitDataRouterAToRouterBTokenAToTokenB.id, bestProfitDataRouterAToRouterBTokenAToTokenB);
      }
    }

    const tokenABalance = balances.get(tokenA);
    const percentA = tokenABalance / BigInt(1000);
    const aToBPath = [tokenA, tokenB, tokenA];

    for (let amountIn = percentA; amountIn < tokenABalance; amountIn = amountIn + percentA) {
      for (const routersAB of routersToCount) {
        const routerARouterBTokenATokenBID = this.getId(routersAB[0].router.address, routersAB[1].router.address, tokenA, tokenB);
        const bestProfitDataAB = map.get(routerARouterBTokenATokenBID);

        const expectedAmountOffChain = arbitrageContract.getExpectedAmountOffChain(routersAB, aToBPath, amountIn);
        const profit = expectedAmountOffChain - amountIn;

        if (profit > BigInt(0) && (!bestProfitDataAB.lastProfit || profit > bestProfitDataAB.lastProfit)) {
          bestProfitDataAB.amountIn = amountIn;
          bestProfitDataAB.amountOut = expectedAmountOffChain;
          bestProfitDataAB.lastProfit = profit;
          bestProfitDataAB.profit = profit;
          bestProfitDataAB.profitWETH = profit;

          map.set(routerARouterBTokenATokenBID, bestProfitDataAB);
        }
      }
    }

    this.logger.debug(`best profit count end at ${Date.now() - from} mc`, debugLabel);
    return [...map.values()].sort((a, b) => a.profitWETH > b.profitWETH ? -1 : 1)[0];
  }

  private getId(routerIn: string, routerOut: string, profitToken: string, middleToken: string) {
    return `${routerIn}/${routerOut}-${profitToken}/${middleToken}`;
  }

  public async approve(tokenContract: ERC20TokenContract, signer: string, arbitrageContract: string, network: Networks) {
    const arbitrageContractAddress = arbitrageContract;

    const aggregatedResult = await this.multicall.aggregateMulti(
      [
        tokenContract.getDataToMulticall("allowance", [signer, arbitrageContractAddress]),
        tokenContract.getDataToMulticall("balanceOf", [signer])
      ],
      network
    );

    const balance = aggregatedResult[1][0];
    const allowance = aggregatedResult[0][0];

    if (allowance < balance) {
      this.logger.debug(`We need to approve swap.`);

      const amount = toBigInt(balance) * toBigInt("10");

      this.logger.debug(`balance = ${formatEther(balance)}, approvedAmount = ${formatEther(amount)}`);

      const approveTransaction = await tokenContract.approve(arbitrageContractAddress, amount);
      const receipt = await approveTransaction.wait(3);
      this.logger.debug(`Successfully approved. ${this.configuration.configuration.dex_constants.bsc.scanUrl}${receipt.hash}`);
    } else {
      this.logger.debug(`We need to approve swap. No.`);
    }
  }

  public async getTransactionFee(swapArgs: SwapArgs,
                                 signer: Signer,
                                 arbitrageContract: ArbitrageContract,
                                 network: Networks,
                                 blockTag: string,
                                 contractTransaction?: ContractTransaction): Promise<TransactionFee> {
    const from = Date.now();

    if (!contractTransaction) {
      const feeData = {
        ...swapArgs.feeData,
        gasLimit: this.gasLimit
      };

      contractTransaction = await arbitrageContract.instance.getFunction("safeSwap").populateTransaction(
        swapArgs.routerIn,
        swapArgs.routerOut,
        swapArgs.fromToken,
        swapArgs.toToken,
        swapArgs.amountIn,
        feeData
      );
      this.logger.debug(`populateTransaction end at ${Date.now() - from} ms`);
    }

    const gasAmount = await signer.estimateGas({
      chainId: this.configuration.configuration.dex_constants[network].network.rpc.id,
      blockTag: blockTag,
      ...contractTransaction
    });
    const feeData1 = await signer.provider.getFeeData();
    this.logger.debug(`estimateGas end at ${Date.now() - from} ms`);

    return {
      gasAmount: gasAmount,
      gasPrice: contractTransaction.gasPrice,
      fee: contractTransaction.gasPrice * BigInt(gasAmount),
      maxFeePerGas: feeData1.maxFeePerGas,
      maxPriorityFeePerGas: feeData1.maxPriorityFeePerGas
    };
  }

  private logArgs(args, debugLabel: string) {
    this.logger.debug(`logArgs: args = ${Object.entries(args)
      .map(value => {
        value[1] = typeof value[1] === "bigint" ? formatUnits(<BigNumberish>value[1]) : value[1];
        return `${value[0]}: ${value[1]} `;
      })} `, debugLabel);
  }
}
