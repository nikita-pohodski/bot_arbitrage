import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { MulticallContract, MyWebSocketProvider } from "../contracts";
import { ArbitrageIterationParams } from "../dto";
import { ArbitragePairsConfig, wsEvent } from "../config/ArbitragePairsConfig";
import { ArbitrageServiceOfChainRouters } from "./arbitrage.service.ofchain.routers";
import { ArbitrageUtils } from "./arbitrage.utils";
import { Networks } from "../utils/constants";
import { ContractFabric } from "../fabrics/ContractFabric";

const NETWORK = Networks.POLYGON;

@Injectable()
export class ArbitrageListenerPolygon implements OnModuleInit {

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
  private balances = new Map<string, bigint>();

  private reservesLoading = false;
  private reservesUpdating = false;
  private balanceLoading = false;
  private arbitrageIterationInProcess = false;

  // @Cron(CronExpression.EVERY_MINUTE)
  async reconnectToWS() {
    if (this.events.length > 0) {
      if (!this.reservesLoading && !this.reservesUpdating && !this.balanceLoading && !this.arbitrageIterationInProcess) {
        const from = Date.now();

        for (const event of this.events) {
          await this.wsProvider.instance.off(event);
        }

        this.wsProvider.reload();

        await this.arbitrageProcess({ isOnModuleInit: false });

        this.logger.log(`Reconnect to web socket at ${Date.now() - from} ms`);
      } else {
        setTimeout(async () => {
          await this.reconnectToWS();
        }, 10);
      }
    }
  }

  async onModuleInit() {
    this.logger.log(`------------------<--Arbitrage bot is starting-->------------------`);
    this.logger.log(`-------------------\\${NETWORK}/-------------------`);

    await this.loadTokensOnPairs();
    await this.loadBalances();
    await this.loadReserves();
    this.arbitrageProcess({ isOnModuleInit: true });
  }

  public async arbitrageProcess({ isOnModuleInit }: { isOnModuleInit: boolean }) {
    const pairConfigData = this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK);

    for (const arbitragePairData of pairConfigData) {
      if (isOnModuleInit) {
        for (const token of arbitragePairData.tokens) {
          await this.arbitrageService.approve(token.contract, this.contractFabric.signerPolygon.address, arbitragePairData.arbitrageContract.address, NETWORK);
        }
      }
    }

    for (const arbitragePair of pairConfigData) {
      const arbitragePairName = arbitragePair.name;
      const arbitragePairData = arbitragePair;

      const event = wsEvent(arbitragePairData.routersData.map(value => value.pair.address));
      this.events.push(event);

      this.logger.log(`Arbitrage process is starting for ${arbitragePairName} pair`);

      if (isOnModuleInit) {
        this.arbitrageIteration(Date.now(), `start-${arbitragePairName}`, arbitragePairData, this.balances, this.pairReserves);
      }

      this.wsProvider.instance.on(event, async (tx) => {
        await this.wsListener(tx, arbitragePairData);
        await this.loadReserves();
        await this.loadBalances();

        setTimeout(() => {
          this.loadReserves();
        }, 3000);
      }).catch(reason => {
        this.logger.error(`Web Socket provider is closing the connection with error`, reason, "WSProvider");
      });
    }
  }

  private async wsListener(tx, arbitragePairData: ArbitrageIterationParams) {
    this.arbitrageIterationInProcess = true;

    const from = Date.now();

    if (this.reservesLoading || this.reservesUpdating) {
      this.logger.debug("Reserves is loading");
      setTimeout(() => {
        this.wsListener(tx, arbitragePairData);
      }, 50);
    } else {
      const context = String(tx.transactionHash).slice(0, 10);
      try {

        const transactionResponse = await this.getTransaction(tx);

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

        const startAt = Date.now();

        await this.arbitrageIteration(startAt, context, arbitragePairData, this.balances, this.pairReserves);

        this.arbitrageIterationInProcess = false;
        this.logger.log(`Arbitrage iteration ended at ${Date.now() - startAt} mc`, context);
        this.logger.log(`Arbitrage process ended at ${Date.now() - from} mc`, context);
      } catch (e) {
        this.logger.error("Arbitrage iteration ended with error", e, context);
      }
    }
  }

  private async getTransaction(tx) {
    const from = Date.now();
    const transactionResponse = await this.wsProvider.instance.getTransactionReceipt(tx.transactionHash);
    this.logger.log(`Get transactionReceipt at ${Date.now() - from} mc`);
    return transactionResponse;
  }

  async arbitrageIteration(startAt: number, debugLabel: string, {
    routersData,
    tokens,
    arbitrageContract,
    name,
    network
  }: ArbitrageIterationParams, balances: Map<string, bigint>, pairReserves) {
    this.logger.log(`arbitrageIteration in config ${name}`, debugLabel);

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

  private async loadBalances() {
    this.balanceLoading = true;
    //set balances
    const from = Date.now();
    for (const arbitragePairData of this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK)) {
      const tokens = arbitragePairData.tokens;

      const balanceCallsAndAddress = tokens.map(token => {
        const address = arbitragePairData.arbitrageContract.address;
        return {
          token: token.contract.address.toLowerCase(),
          call: token.contract.getDataToMulticall("balanceOf", [address])
        };
      });

      const [resultMulticall] = await Promise.all([
        this.multicall.connect(NETWORK, this.wsProvider).aggregateMulti(balanceCallsAndAddress.map(value => value.call), NETWORK)
      ]);

      balanceCallsAndAddress.forEach((tokenAndCall, index) => {
        this.balances.set(tokenAndCall.token, resultMulticall[index][0]);
      });
    }

    this.balanceLoading = false;
    this.logger.debug(`Load balances ended at ${Date.now() - from}`);
  }

  private async loadTokensOnPairs() {
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
    this.logger.debug(`Load tokens on pais ended at ${Date.now() - from}`);
  }

  private async loadReserves(mapToSave?: Map<string, Map<string, bigint>>) {
    const from = Date.now();
    this.reservesLoading = true;

    for (const arbitragePairData of this.pairsConfig.arbitrageConfigs.filter(value => value.network === NETWORK)) {
      const reservesCallsAndAddresses = arbitragePairData.routersData.map(router => {
        return {
          router: router,
          pair: router.pair,
          call: router.pair.getDataToMulticall("getReserves")
        };
      });

      const [resultMulticall] = await Promise.all([
        this.multicall.connect(NETWORK, this.wsProvider).aggregateMulti(reservesCallsAndAddresses.map(routerAndPairData => routerAndPairData.call), NETWORK)
      ]);

      reservesCallsAndAddresses.forEach((routerAndPairData, index) => {
        const tokenReserves = new Map<string, bigint>();
        tokenReserves.set(routerAndPairData.pair.getToken0(), resultMulticall[index][0]);
        tokenReserves.set(routerAndPairData.pair.getToken1(), resultMulticall[index][1]);

        this.pairReserves.set(routerAndPairData.pair.address, tokenReserves);
      });
    }

    this.reservesLoading = false;
    this.logger.debug(`Load reserves on pais ended at ${Date.now() - from}`);

    if (mapToSave) {
      mapToSave = new Map(this.pairReserves);
    }

    return mapToSave;
  }

}
