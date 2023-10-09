import { Logger, Module } from "@nestjs/common";
import { ArbitrageUtils } from "./arbitrage/arbitrage.utils";
import { MulticallContract } from "./contracts";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import { ArbitragePairsConfig } from "./config/ArbitragePairsConfig";
import { ContractFabric } from "./fabrics/ContractFabric";
import { ArbitrageServiceOfChainRouters } from "./arbitrage/arbitrage.service.ofchain.routers";
import { ArbitrageConfig } from "./config/ArbitrageConfig";
import { ArbitrageSwapBsc } from "./arbitrage/arbitrage.swap.bsc";
import { HttpModule } from "@nestjs/axios";
import { BloXRouteApi } from "./services/BloxrouteApi";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [],
  providers: [
    ContractFabric,
    Logger,
    ArbitrageConfig,
    // ArbitrageListenerBsc,
    // ArbitrageListenerPolygon,
    ArbitrageServiceOfChainRouters,
    ArbitrageUtils,
    MulticallContract,
    ArbitragePairsConfig,
    ArbitrageSwapBsc,
    BloXRouteApi
  ]
})
export class AppModule {
}
