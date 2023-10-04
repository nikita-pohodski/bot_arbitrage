import { Provider, Wallet } from "ethers";
import { MyProvider, Payable } from "../dto";


export class ArbitrageWallet implements Payable {
  #instance: Wallet;
  #reloadInProcess: boolean;
  readonly #pk: string;
  readonly #provider: MyProvider<Provider>;

  constructor(pk: string, provider: MyProvider<Provider>) {
    this.#pk = pk;
    this.#provider = provider;
    this.#instance = new Wallet(pk, provider.instance);
  }

  public reload(provider: MyProvider<Provider>): Wallet {
    this.#reloadInProcess = true;
    this.#instance = null;
    this.#instance = new Wallet(this.#pk, provider.instance);
    this.#reloadInProcess = false;
    return this.instance;
  }

  get instance(): Wallet {
    if (this.#instance) {
      return this.#instance;
    } else {
      return this.reload(this.#provider);
    }
  }

  get address(): string {
    return this.#instance.address;
  }
}
