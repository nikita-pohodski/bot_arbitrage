import { RouterData, TokenData } from "../../dto";
import { ERC20TokenContract } from "../../contracts";
import { ContractTransaction } from "ethers";

export interface MaxProfitData {
  path?: string[],
  profitTokenAmountIn?: bigint,
  amounts?: bigint[],
  amountInHypothetical?: bigint,
  amountIn?: bigint,
  amountOut?: bigint,
  profit?: bigint,
  profitWETH: bigint,
  profitRouter?: string,
  middleRouter?: string,
  isUndefined: boolean,
  swapPopulate?: ContractTransaction,
}

export type TransactionFee = { gasAmount, gasPrice, fee, maxFeePerGas, maxPriorityFeePerGas };

export interface ArbitrageServiceInterface {
  crossDexArbitrage(debugLabel: string, routerIn: RouterData, routerOut: RouterData, pairData: TokenData[]): Promise<any>;

  approve(tokenContract: ERC20TokenContract): Promise<any>;
}
