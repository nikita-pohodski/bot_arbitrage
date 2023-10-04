import { WebSocketProvider } from "ethers";
import { MyProvider } from "../dto";

export class MyWebSocketProvider implements MyProvider<WebSocketProvider> {
  #instance: WebSocketProvider;
  #reloadInProcess: boolean = false;
  readonly #url;
  readonly #id;

  constructor({ url, id }: { url: string, id: number }) {
    this.#url = url;
    this.#id = id;
    this.#instance = new WebSocketProvider(url, id);
  }

  public reload(): WebSocketProvider {
    this.#reloadInProcess = true;
    this.#instance = null;
    this.#instance = new WebSocketProvider(this.#url, this.#id);
    this.#reloadInProcess = false;
    return this.instance;
  }

  get instance(): WebSocketProvider {
    if (this.#instance) {
      return this.#instance;
    } else {
      return this.reload();
    }
  }
}
