import { Contract, ContractRunner } from "ethers";
import { AggregateMultiParams } from "./MulticallContract";

export interface Multicalled {
  getDataToMulticall(methodName: string, params: any[]): AggregateMultiParams;
}

export class MyBaseContract implements Multicalled {
  private readonly _instance: Contract;
  private readonly _address: string;

  constructor(address: string, abi, provider: ContractRunner) {
    this._instance = new Contract(address, abi, provider);
    this._address = address;
  }

  get instance() {
    return this._instance;
  }

  get address() {
    return this._address.toLowerCase();
  }

  public getDataToMulticall(methodName: string, params: any[] = []): AggregateMultiParams {
    return {
      contractInterface: this._instance.interface,
      target: this._address,
      callData: { name: methodName, params: params }
    };
  }
}
