import { JsonRpcProvider } from "ethers";
import { GasPriceOracle } from "gas-price-oracle";
import { Cron, CronExpression } from "@nestjs/schedule";
import { GasPrice } from "gas-price-oracle/lib/services";
import { MyProvider } from "../dto";
import { getRandom } from "../utils/util";

export class MyRpcProvider implements MyProvider<JsonRpcProvider> {
  private readonly _instance: JsonRpcProvider;
  private readonly _oracle: GasPriceOracle;
  private _gasPrices;
  readonly #url;
  readonly #id;

  constructor({ url, id }: { url: string, id: number }) {
    this.#url = url;
    this.#id = id;
    this._instance = new JsonRpcProvider(url, id);
    this._oracle = new GasPriceOracle({ chainId: id, defaultRpc: url, shouldCache: true });
    this.checkPrices();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  checkPrices() {
    this.oracle.gasPrices({ isLegacy: true }).then(value => {
      this._gasPrices = value;
      const low = +this._gasPrices.low;
      const standard = +this._gasPrices.standard;

      this._gasPrices.my = this.getMyPrice(low, standard);
    });
  }

  get instance(): JsonRpcProvider {
    return this._instance;
  }

  get oracle(): GasPriceOracle {
    return this._oracle;
  }

  public async gasPrices(): Promise<(GasPrice & { my: number })> {
    if (this._gasPrices) {
      this._gasPrices.my = this.getMyPrice(this._gasPrices.low, this._gasPrices.standard);
      return this._gasPrices;
    } else {
      this._gasPrices = (await this._oracle.gasPrices({ isLegacy: true }));
      this._gasPrices.my = this.getMyPrice(this._gasPrices.low, this._gasPrices.standard);
      return this.gasPrices();
    }
  }

  private getMyPrice(lowPrice: number, standardPrice: number): number {
    const my = lowPrice * getRandom(1_000_000_000, 1_300_000_000) / 1_000_000_000;

    return lowPrice <= standardPrice ? +my.toFixed(10) : lowPrice;
  }
}
