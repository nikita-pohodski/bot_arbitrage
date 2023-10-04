import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AggregateMultiParams, MulticallContract, MyWebSocketProvider, PairV2Contract } from "../contracts";
import { ArbitrageIterationParams, RouterData } from "../dto";
import { ArbitragePairsConfig, wsEvent } from "../config/ArbitragePairsConfig";
import { ArbitrageServiceOfChainRouters } from "./arbitrage.service.ofchain.routers";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ArbitrageUtils } from "./arbitrage.utils";
import { Networks } from "../utils/constants";
import { ContractFabric } from "../fabrics/ContractFabric";
import { TransactionReceipt } from "ethers";

const NETWORK = Networks.BSC;

@Injectable()
export class ArbitrageListenerBsc implements OnModuleInit {

  constructor(
    private readonly contractFabric: ContractFabric,
    private readonly pairsConfig: ArbitragePairsConfig,
    private readonly logger: Logger,
    private readonly multicall: MulticallContract,
    private readonly arbitrageService: ArbitrageServiceOfChainRouters,
    private readonly arbitrageUtils: ArbitrageUtils
  ) {
  }

  private readonly wsProvider: MyWebSocketProvider = this.contractFabric.CONFIG[NETWORK].providers.wss;

  private events = [];
  private pairReserves = new Map<string, Map<string, bigint>>();
  private balances = new Map<string, Map<string, bigint>>();

  private reservesLoading = false;
  private reservesUpdating = false;
  private balanceLoading = false;
  private arbitrageIterationInProcess = false;
  private processedTransactions = new Set<string>();

  @Cron(CronExpression.EVERY_MINUTE)
  async reconnectToWS() {
    try {
      if (this.events.length > 0) {
        if (this.reservesLoading && this.reservesUpdating && this.balanceLoading && this.arbitrageIterationInProcess) {
          setTimeout(async () => {
            await this.reconnectToWS();
          }, 10);
        } else {
          const from = Date.now();

          await this.wsProvider.instance.removeAllListeners();
          await this.wsProvider.instance.destroy();
          await this.wsProvider.reload();
          await this.multicall.connect(NETWORK, this.wsProvider);

          await this.arbitrageProcess({ isOnModuleInit: false });

          this.logger.log(`Reconnect to web socket at ${Date.now() - from} ms`);
        }
      }
    } catch (e) {
      this.logger.error("reconnectToWS error", e, "reconnectToWS " + NETWORK);
    }
  }

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
    try {
      const pairConfigData = this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK);

      for (const arbitragePairData of pairConfigData) {
        if (isOnModuleInit) {
          for (const token of arbitragePairData.tokens) {
            await this.arbitrageService.approve(token.contract, this.contractFabric.signerBsc.address, arbitragePairData.arbitrageContract.address, NETWORK);
          }
        }
      }

      this.events = [];

      for (const arbitragePair of pairConfigData) {
        const arbitragePairName = arbitragePair.name;
        const arbitragePairData = arbitragePair;

        const event = wsEvent(arbitragePairData.routersData.map(value => value.pair.address));
        this.events.push(event);

        if (isOnModuleInit) {
          await this.arbitrageIteration(Date.now(), `start-${arbitragePairName}`, arbitragePairData, this.balances.get(arbitragePair.arbitrageContract.address), this.pairReserves);
        }

        const listener = async (tx) => {
          const context = String(tx.transactionHash).slice(0, 10);

          await this.wsListener(tx, arbitragePairData, context);
          await Promise.all([
            this.loadReserves(context),
            this.loadBalances(context),
            this.arbitrageService.loadNonceAndBlockTag(NETWORK)
          ]);

          setTimeout(() => {
            this.loadReserves(context);
            this.arbitrageService.loadNonceAndBlockTag(NETWORK);
          }, 3000);
        };

        this.wsProvider.instance.on(event, listener)
          .catch(reason => this.logger.error(`Web Socket provider is closing the connection with error`, reason, "WSProvider"));
      }
    } catch (e) {
      this.logger.error("arbitrageProcess error", e, "arbitrageProcess " + NETWORK);
    }
  }

  private async wsListener(tx, arbitragePairData: ArbitrageIterationParams, context) {
    this.arbitrageIterationInProcess = true;

    const from = Date.now();

    if (this.reservesLoading || this.reservesUpdating) {
      setTimeout(() => {
        this.wsListener(tx, arbitragePairData, context);
      }, 50);
      return;
    } else {

      if (this.processedTransactions.has(tx.transactionHash)) {
        this.logger.log(`Transaction ${tx.transactionHash} is processing`, context);
        return;
      }

      this.processedTransactions.add(tx.transactionHash);


      try {
        const loadNonceAndBlockTag = this.arbitrageService.loadNonceAndBlockTag(NETWORK);
        const transactionResponse = await this.getTransaction(tx, context);

        const swapLogs = transactionResponse.logs
          .map(log => this.arbitrageUtils.parseSwapLog(log))
          .filter(swapLog => !!swapLog);

        this.reservesUpdating = true;
        for (const routerData of arbitragePairData.routersData) {
          const pair = routerData.pair.address;

          const pairSwapDTO = swapLogs.find(swapDTO => swapDTO.address.toLowerCase() === pair.toLowerCase());
          if (pairSwapDTO) {
            Array.of(routerData.pair.getToken0(), routerData.pair.getToken1())
              .forEach((token, index) => {
                const tokenReserves = this.pairReserves.get(pair).get(token);
                const prognosesReservesToken = tokenReserves + BigInt(pairSwapDTO[`amount${index}In`]) - BigInt(pairSwapDTO[`amount${index}Out`]);
                this.pairReserves.get(pair).set(token, prognosesReservesToken);
              });
          }
        }
        this.reservesUpdating = false;

        const startAtLoadNonceAndBlockTag = Date.now();
        await loadNonceAndBlockTag;
        this.logger.log(`loadNonceAndBlockTag ended at ${Date.now() - startAtLoadNonceAndBlockTag} mc`, context);

        const startAt = Date.now();
        await this.arbitrageIteration(startAt, context, arbitragePairData, this.balances.get(arbitragePairData.arbitrageContract.address), this.pairReserves);

        this.arbitrageIterationInProcess = false;
        this.logger.log(`Arbitrage process ended at ${Date.now() - from} mc`, context);
      } catch (e) {
        this.logger.error("Arbitrage iteration ended with error", e, context);
      }
    }
  }

  private async getTransaction(tx, context): Promise<TransactionReceipt> {
    const from = Date.now();
    const transactionReceipt = await this.wsProvider.instance.getTransactionReceipt(tx.transactionHash);
    this.logger.log(`Get transactionReceipt at ${Date.now() - from} mc`, context);
    return transactionReceipt;
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
}
