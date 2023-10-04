import { RouterData, TokenData } from "../../dto";
import { ERC20TokenContract } from "../../contracts";
import { ArbitrageContract } from "../../contracts/ArbitrageContract";
import { Networks } from "../../utils/constants";

export interface ArbitrageServiceRoutersInterface {
  crossDexArbitrage(debugLabel: string,
                    routers: RouterData[],
                    pairData: TokenData[],
                    balances: Map<string, bigint>,
                    pairReserves: Map<string, Map<string, bigint>>,
                    arbitrageContract: ArbitrageContract,
                    network: Networks
  ): Promise<any>;

  approve(tokenContract: ERC20TokenContract, signer: string, arbitrageContract: string, network: Networks): Promise<any>;
}
