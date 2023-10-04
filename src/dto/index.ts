import { ERC20TokenContract, PairV2Contract, RouterV2Contract } from "../contracts";
import { ArbitrageContract } from "../contracts/ArbitrageContract";
import { Networks } from "../utils/constants";
import { BigNumberish, ContractTransaction, Provider, TransactionDescription, Wallet } from "ethers";
import { TransactionType } from "../utils/enums";

export interface RouterData {
  name: string,
  router: RouterV2Contract,
  pair: PairV2Contract,
}

export interface TokenData {
  contract: ERC20TokenContract,
  symbol: string,
}

export interface ArbitrageIterationParams {
  name: string;
  network: Networks;
  routersData: RouterData[];
  tokens: TokenData[];
  withEstimate: boolean;
  arbitrageContract: ArbitrageContract;
}


export interface RouterWithReserves {
  router: RouterData,
  reserves: Map<string, bigint>,
  rateMiddleToProfit: bigint
}

export interface BestProfitData {
  path: string[],
  routerInContract: RouterV2Contract,
  routerOutContract: RouterV2Contract,
  amountIn: bigint,
  amountOut: bigint,
  id: string,
  lastProfit?: bigint,
  routerIn: string,
  profit: bigint,
  profitWETH: bigint,
  routerOut: string
}

export interface AllBestProfitDataArgs {
  routers: RouterWithReserves[],
  tokenA: string,
  tokenB: string,
  balances: Map<string, bigint>,
  aToB: boolean | undefined
}

export type SwapArgs = {
  routerIn: string,
  routerOut: string,
  fromToken: string,
  toToken: string,
  amountIn: BigNumberish,
  feeData: {
    gasPrice: bigint,
    gasLimit: number | bigint
  }
};

export interface ParseTransactionResponse {
  parsedData: TransactionDescription;
  dataType: TransactionType;
}

export interface PairSwapDTO {
  amount0In: bigint,
  amount1In: bigint,
  amount1Out: bigint,
  amount0Out: bigint,
  address: string,
  sender: string,
  to: string
}

export interface DexArbitrageData {
  swapData: SwapArgs,
  populateTransaction: ContractTransaction,
  profitData: BestProfitData,
  middleToken: TokenData,
  profitToken: TokenData
}

export interface MyProvider<T extends Provider> {
  get instance(): T;
}

export interface Payable {
  reload(provider?: MyProvider<Provider>): Wallet;

  get instance(): Wallet;

  get address(): string;
}
