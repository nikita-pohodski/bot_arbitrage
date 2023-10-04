import { Injectable, Logger } from "@nestjs/common";
import { Contract } from "ethers";
import Multicall2 from "../abi/multicall/Multicall2.json";
import { ArbitrageConfig } from "../config/ArbitrageConfig";
import { ContractFabric } from "../fabrics/ContractFabric";
import { Networks } from "../utils/constants";
import { MyWebSocketProvider } from "../services/MyWebSocketProvider";

export interface AggregateMultiParams {
  contractInterface: any;
  target: any;
  callData: any;
}

@Injectable()
export class MulticallContract {
  #instances: Map<Networks, Contract>;
  #reloadInProcess: boolean = false;

  constructor(private readonly contractFabric: ContractFabric,
              private readonly arbitrageConfig: ArbitrageConfig,
              private readonly logger: Logger) {
    const map = new Map();

    Object.values(Networks).forEach(network => {
      map.set(network, new Contract(arbitrageConfig.configuration.dex_constants[network].multicall, Multicall2.abi, this.contractFabric.CONFIG[network].providers.rpc.instance));
    });

    this.#instances = map;

  }

  public instance(network: Networks) {
    return this.#instances.get(network);
  }

  connect(network: Networks, provider: MyWebSocketProvider) {
    this.#instances.set(network, new Contract(this.arbitrageConfig.configuration.dex_constants.bsc.multicall, Multicall2.abi, provider.instance));
    return this;
  }

  public reload() {
    this.#reloadInProcess = true;
    const map = new Map();
    Object.values(Networks).forEach(network => {
      map.set(network, new Contract(this.arbitrageConfig.configuration.dex_constants[network].multicall, Multicall2.abi, this.contractFabric.CONFIG[network].providers.rpc.instance));
    });
    this.#instances = map;
    this.#reloadInProcess = false;
    return this;
  }

  async aggregatePromises(calls: any[]): Promise<any[]> {
    const from = Date.now();
    const result = await Promise.all(calls);
    this.logger.debug(`aggregate end at ${Date.now() - from}`);
    return result;

  }

  async aggregateMulti(calls: AggregateMultiParams[], network: Networks) {
    const from = Date.now();
    let methods = "";
    const calldata = calls.map((call) => {
      methods += `${methods.length > 0 ? "," : ""}${call.callData.name}`;

      return ({
        target: String(call.target).toLowerCase(),
        callData: call.contractInterface.encodeFunctionData(String(call.callData.name), call.callData.params)
      });
    });

    const { returnData } = await this.instance(network).getFunction("aggregate").staticCallResult(calldata);
    const multiCallResponse = returnData.map((call, i) => calls[i].contractInterface.decodeFunctionResult(String(calls[i].callData.name), call));
    this.logger.debug(`aggregateMulti end at ${Date.now() - from}`, methods);
    return multiCallResponse;
  }
}
