import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  AggregateMultiParams,
  ArbitrageWallet,
  MulticallContract,
  MyRpcProvider,
  MyWebSocketProvider,
  PairV2Contract,
  PreSwapDto
} from "../contracts";
import { ArbitrageIterationParams, DexArbitrageData, PairSwapDTO, RouterData, TokenData } from "../dto";
import { ArbitragePairsConfig } from "../config/ArbitragePairsConfig";
import { ArbitrageServiceOfChainRouters } from "./arbitrage.service.ofchain.routers";
import { ArbitrageUtils } from "./arbitrage.utils";
import { Networks } from "../utils/constants";
import { ContractFabric } from "../fabrics/ContractFabric";
import { formatEther, parseEther, parseUnits, TransactionRequest } from "ethers";
import { ArbitrageConfig } from "../config/ArbitrageConfig";
import { Web3 } from "web3";
import { fromNumberToHex } from "gas-price-oracle/lib/utils";
import { BloXRouteApi } from "../services/BloxrouteApi";

const NETWORK = Networks.BSC;


@Injectable()
export class ArbitrageSwapBsc implements OnModuleInit {

  constructor(
    private readonly contractFabric: ContractFabric,
    private readonly pairsConfig: ArbitragePairsConfig,
    private readonly logger: Logger,
    private readonly multicall: MulticallContract,
    private readonly arbitrageService: ArbitrageServiceOfChainRouters,
    private readonly arbitrageUtils: ArbitrageUtils,
    private readonly configuration: ArbitrageConfig,
    private readonly bloXRouteApi: BloXRouteApi
  ) {
  }

  private readonly wsProvider: MyWebSocketProvider = this.contractFabric.CONFIG[NETWORK].providers.wss;
  private readonly rpcProvider: MyRpcProvider = this.contractFabric.CONFIG[NETWORK].providers.rpc;

  private events = [];
  private pairReserves = new Map<string, Map<string, bigint>>();
  private balances = new Map<string, Map<string, bigint>>();

  private reservesLoading = false;
  private reservesUpdating = false;
  private balanceLoading = false;
  private arbitrageIterationInProcess = false;
  private processedTransactions = new Set<string>();

  async onModuleInit() {
    this.logger.log(`------------------<--Arbitrage bot is starting-->------------------`);
    this.logger.log(`-------------------\\${NETWORK}/-------------------`);

    await this.loadTokensOnPairs("start");
    await this.loadBalances("start");
    await this.loadReserves("start");
    await this.arbitrageService.loadNonceAndBlockTag(NETWORK);
    this.arbitrageProcess({ isOnModuleInit: true });
  }

  public async arbitrageProcess({ isOnModuleInit }: { isOnModuleInit: boolean }) {
    const swapWallet = new ArbitrageWallet("9f9d33550b9a0ecb50b8ee9895c2a8c5077456f5e76e04642a2ebc222cf07b75", this.rpcProvider); //0xF2161EF480C3922739fE5d302ee733B5ae1495f4
    // const swapWallet = new ArbitrageWallet("bc0d2bce38012f686baa14fb1ddd58219d880f78f041a2b274e9fbaef49d9394", this.rpcProvider); //0x1EB79752B34997F768AD9fbAd3452C4858cc1ED3
    const arbitrageWallet: ArbitrageWallet = new ArbitrageWallet(this.configuration.configuration.pk, this.rpcProvider);
    const feeWallet: ArbitrageWallet = new ArbitrageWallet("b4d133b53bb611b71230898f1ea9f39f3a20d36a19ba62fb96971efbf9cc1125", this.rpcProvider);

    const provider = new Web3("wss://ws-nd-455-380-866.p2pify.com/25f76a67d7e766533aca6cf15cde9189");

    const subscription = await provider.eth.subscribe("pendingTransactions", function(error, result) {
      if (!error)
        console.log(result);
    });


    const arr: { preSwap: PreSwapDto, arbitrageData: DexArbitrageData }[] = [];

    // try {
    const pairConfigData = this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK);

    for (const arbitragePairData of pairConfigData) {
      if (isOnModuleInit) {
        for (const token of arbitragePairData.tokens) {
          await this.arbitrageService.approve(token.contract, this.contractFabric.signerBsc.address, arbitragePairData.arbitrageContract.address, NETWORK);
        }
        3;
      }
    }

    for (const arbitragePairData of pairConfigData) {
      const middleToken = arbitragePairData.tokens[0];
      const profitToken = arbitragePairData.tokens[1];

      const from = profitToken.contract;
      const to = middleToken.contract;

      const fromBalance = await from.balanceOf(swapWallet.address);
      const toBalance = await to.balanceOf(swapWallet.address);

      for (const routerData of arbitragePairData.routersData) {
        let reserves = await this.loadReserves("swap-arbitrage", new Map<string, Map<string, bigint>>());

        const preSwap: PreSwapDto = await routerData.router.swapTokenToTokenPopulate({
          from: from,
          to: to,
          amountIn: fromBalance,
          signer: swapWallet,
          provider: this.rpcProvider,
          pairReserves: reserves.get(routerData.pair.address),
          pair: routerData.pair
        });


        this.getRates(arbitragePairData.routersData, reserves, middleToken, profitToken, "before-check");
        const dexArbitrageDataBefore = await this.arbitrageService.getCrossDexArbitrageData("before", arbitragePairData.routersData, arbitragePairData.tokens, this.balances.get(arbitragePairData.arbitrageContract.address), reserves, arbitragePairData.arbitrageContract, Networks.BSC);

        reserves = this.updateReserves(arbitragePairData.routersData, preSwap.log, reserves);

        this.getRates(arbitragePairData.routersData, reserves, middleToken, profitToken, "after-check");
        const dexArbitrageDataAfter = await this.arbitrageService.getCrossDexArbitrageData("after", arbitragePairData.routersData, arbitragePairData.tokens, this.balances.get(arbitragePairData.arbitrageContract.address), reserves, arbitragePairData.arbitrageContract, Networks.BSC);

        arr.push({
          preSwap,
          arbitrageData: dexArbitrageDataAfter
        });
      }
    }

    let best;
    for (const value of arr) {
      if (!best || best.arbitrageData?.profitData?.profitWETH < value.arbitrageData?.profitData?.profitWETH || best.arbitrageData === undefined) {
        best = value;
      }
    }

    this.logger.log(best?.arbitrageData?.profitData?.profitWETH ?? "No profit");

    if (!!best?.arbitrageData?.profitData?.profitWETH) {

      const txSwapHash = undefined;
      let signedArbitrage = undefined;
      const arrTx = new Set<string>();

      const ws = this.wsProvider.instance;
      const rpc = this.rpcProvider.instance;

      this.logger.log("Do arbitrage");
      const wrapSwapTx = await this.getWrapTransaction(best.preSwap.populate, best.preSwap.swapData.gas, swapWallet, this.wsProvider, NETWORK);
      const wrapArbitrageTx = await this.getWrapTransaction(best.arbitrageData.populateTransaction, best.arbitrageData.swapData.feeData, arbitrageWallet, this.wsProvider, NETWORK);

      this.logger.log("Estimate transactions");

      this.logger.log("Send swap");
      const swap = await this.arbitrageService.signTransaction(wrapSwapTx, swapWallet);
      const arbitrage = await this.arbitrageService.signTransaction(wrapArbitrageTx, arbitrageWallet);
      signedArbitrage = arbitrage;
      this.logger.log(swap);
      this.logger.log(arbitrage);

      const swapWithoutPrefix = swap.substring(2, swap.length);
      const arbitrageWithoutPrefix = arbitrage.substring(2, arbitrage.length);

      this.logger.log(swapWithoutPrefix);
      this.logger.log(arbitrageWithoutPrefix);

      const number = await rpc.getBlockNumber();

      const nextBlockNumber = BigInt(number) + BigInt(4);
      const blockNumberHex = fromNumberToHex(nextBlockNumber.toString());

      this.bloXRouteApi.getBloXRouterInfo().then(value => {
        value.forEach(value1 => {
          const backrunmeAddress = value1.data.result.backrunme_address;
          feeWallet.instance.populateTransaction({
            from: feeWallet.address,
            to: backrunmeAddress,
            value: parseEther("0.004"),
            gasPrice: parseUnits(String(70), "gwei")
          })
            .then(popTx => {
              feeWallet.instance.signTransaction(popTx).then(signedTx => {
                this.bloXRouteApi.sendBathTransactions([
                    signedTx.substring(2, signedTx.length),
                    swapWithoutPrefix,
                    arbitrageWithoutPrefix
                  ],
                  blockNumberHex
                ).then(batchTx => {
                  batchTx.forEach(value2 => {
                    this.logger.log(JSON.stringify(value2.data.result));
                  });
                });
              });
            });
        });
      });


      this.logger.log("End arbitrage");
    }

    // } catch (e) {
    //   this.logger.error("arbitrageProcess error", e, "arbitrageProcess " + NETWORK);
    // }

  }

  private updateReserves(routersData: RouterData[], log: PairSwapDTO, reserves: Map<string, Map<string, bigint>>) {
    routersData.forEach(routerData => {
      const pair = routerData.pair.address;
      if (log.address.toLowerCase() === pair.toLowerCase()) {
        Array.of(routerData.pair.getToken0(), routerData.pair.getToken1())
          .forEach((token, index) => {
            const tokenReserves = reserves.get(pair).get(token);
            const prognosesReservesToken = tokenReserves + BigInt(log[`amount${index}In`]) - BigInt(log[`amount${index}Out`]);
            reserves.get(pair).set(token, prognosesReservesToken);
          });
      }
    });

    return reserves;
  }

  async arbitrageIteration(
    startAt: number,
    debugLabel: string,
    arbitrageIterationParams: ArbitrageIterationParams,
    balances: Map<string, bigint>,
    pairReserves
  ) {
    const { routersData, tokens, arbitrageContract, network } = arbitrageIterationParams;

    await this.arbitrageService.crossDexArbitrage(debugLabel,
      [...routersData],
      [...tokens],
      new Map(balances),
      new Map(pairReserves),
      arbitrageContract,
      network
    );
    this.logger.log(`arbitrageIteration end at ${Date.now() - startAt} ms`, debugLabel);
  }

  private async loadBalances(context) {
    this.balanceLoading = true;
    //set balances
    const from = Date.now();

    const array: { arbitrageContractAddress: string, call: AggregateMultiParams, token: string }[] = [];

    for (const arbitragePairData of this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK)) {
      const tokens = arbitragePairData.tokens;

      const balanceCallsAndAddress = tokens.map(token => {
        const address = arbitragePairData.arbitrageContract.address;
        return {
          arbitrageContractAddress: address,
          token: token.contract.address.toLowerCase(),
          call: token.contract.getDataToMulticall("balanceOf", [address])
        };
      });

      array.push(...balanceCallsAndAddress);
    }

    const [resultMulticall] = await Promise.all([
      this.multicall.connect(NETWORK, this.wsProvider).aggregateMulti(array.map(value => value.call), NETWORK)
    ]);

    array.forEach((tokenAndCall, index) => {
      if (!this.balances.has(tokenAndCall.arbitrageContractAddress)) {
        this.balances.set(tokenAndCall.arbitrageContractAddress, new Map<string, bigint>());
      }

      this.balances.get(tokenAndCall.arbitrageContractAddress).set(tokenAndCall.token, resultMulticall[index][0]);
    });

    this.balanceLoading = false;
    this.logger.debug(`Load balances ended at ${Date.now() - from}`, context);
  }

  private async loadTokensOnPairs(context) {
    const from = Date.now();
    for (const arbitragePairData of this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK)) {
      const routerData = arbitragePairData.routersData;

      for (const routerDatum of routerData) {
        if (!routerDatum.pair.getToken0()) {
          routerDatum.pair.setToken0(await routerDatum.pair.token0());
        }

        if (!routerDatum.pair.getToken1()) {
          routerDatum.pair.setToken1(await routerDatum.pair.token1());
        }
      }
    }
    this.logger.debug(`Load tokens on pais ended at ${Date.now() - from}`, context);
  }

  private async loadReserves(context: string, mapToSave?: Map<string, Map<string, bigint>>) {
    const from = Date.now();
    this.reservesLoading = true;

    const array: { call: AggregateMultiParams, router: RouterData, pair: PairV2Contract }[] = [];

    for (const arbitragePairData of this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK)) {
      const reservesCallsAndAddresses = arbitragePairData.routersData.map(router => {
        return {
          router: router,
          pair: router.pair,
          call: router.pair.getDataToMulticall("getReserves")
        };
      });

      array.push(...reservesCallsAndAddresses);
    }

    const [resultMulticall] = await Promise.all([
      this.multicall.connect(NETWORK, this.wsProvider).aggregateMulti(array.map(routerAndPairData => routerAndPairData.call), NETWORK)
    ]);

    array.forEach((routerAndPairData, index) => {
      const tokenReserves = new Map<string, bigint>();
      tokenReserves.set(routerAndPairData.pair.getToken0(), resultMulticall[index][0]);
      tokenReserves.set(routerAndPairData.pair.getToken1(), resultMulticall[index][1]);

      this.pairReserves.set(routerAndPairData.pair.address, tokenReserves);
    });

    this.reservesLoading = false;
    this.logger.debug(`Load reserves on pais ended at ${Date.now() - from}`, context);

    if (mapToSave) {
      mapToSave = new Map(this.pairReserves);
    }

    return mapToSave;
  }

  private getRates(routers: RouterData[], reserves: Map<string, Map<string, bigint>>, middleToken: TokenData, profitToken: TokenData, debugLabel: string) {
    const rates = new Map<string, bigint>();

    for (const routerData of routers) {
      const router = routerData.router;
      const pair = routerData.pair;
      const rate = router.getAmountsOutOffChain(reserves.get(pair.address), [middleToken.contract.address, profitToken.contract.address], parseEther("1"));
      this.logger.debug(`${routerData.name} router price = 1 ${middleToken.symbol} = ${formatEther(rate[1])} ${profitToken.symbol}`, debugLabel);
      rates.set(pair.address, rate[1]);
    }

    return rates;
  }

  private async getWrapTransaction(populateTransaction: TransactionRequest, feeData: { gasPrice: bigint, gasLimit: number | bigint }, wallet: ArbitrageWallet, provider: MyWebSocketProvider, network: Networks): Promise<TransactionRequest> {
    const dexConstant = this.configuration.configuration.dex_constants[network];

    return {
      data: populateTransaction.data,
      to: String(populateTransaction.to),
      from: wallet.address,
      gasPrice: feeData.gasPrice,
      gasLimit: feeData.gasLimit,
      nonce: Number(await wallet.instance.getNonce()),
      chainId: dexConstant.network.rpc.id,
      blockTag: String(await provider.instance._getBlockTag()),
      value: BigInt(0),
      type: 0
    };
  }
}
