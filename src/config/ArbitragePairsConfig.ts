import { Injectable } from "@nestjs/common";
import { id } from "ethers";
import { ContractFabric } from "../fabrics/ContractFabric";
import { ArbitrageIterationParams } from "../dto";
import { ArbitrageConfig } from "./ArbitrageConfig";
import { Networks } from "../utils/constants";

export const wsEvent = (pairAddresses: string[]) => {
  return {
    address: pairAddresses,
    topics: [id("Swap(address,uint256,uint256,uint256,uint256,address)")]
  };
};

@Injectable()
export class ArbitragePairsConfig {

  constructor(
    private readonly arbitrageConfig: ArbitrageConfig,
    private readonly contractFabric: ContractFabric
  ) {
  }

  public readonly arbitrageConfigs: ArbitrageIterationParams[] = [
    // {
    //   name: "WBNB/ALM:ALIUM/ALIUM_OLD/PANCAKE",
    //   network: Networks.BSC,
    //   routersData: [
    //     {
    //       name: "Alium",
    //       router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.ALIUM,
    //       pair: this.contractFabric.aliumWBNB_ALMPair
    //     },
    //     {
    //       name: "Pancake",
    //       router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.PANCAKE,
    //       pair: this.contractFabric.pancakeWBNB_ALMPair
    //     },
    //     {
    //       name: "Alium_old",
    //       router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.ALIUM_OLD,
    //       pair: this.contractFabric.alium_oldWBNB_ALMPair
    //     }
    //   ],
    //   tokens: [
    //     {
    //       symbol: "ALM",
    //       contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.ALM
    //     },
    //     {
    //       symbol: "WBNB",
    //       contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.WBNB
    //     }
    //   ],
    //   withEstimate: false,
    //   arbitrageContract: this.contractFabric.CONFIG[Networks.BSC].ARBITRAGE_V2
    // },
    // {
    //   name: "WBNB/BABY:BABYSWAP/PANCAKE",
    //   network: Networks.BSC,
    //   routersData: [
    //     {
    //       name: "BABYSWAP",
    //       router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.BABYSWAP,
    //       pair: this.contractFabric.babyswapWBNB_BABYPair
    //     },
    //     {
    //       name: "Pancake",
    //       router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.PANCAKE,
    //       pair: this.contractFabric.pancakeWBNB_BABYPair
    //     }
    //   ],
    //   tokens: [
    //     {
    //       symbol: "BABY",
    //       contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.BABY
    //     },
    //     {
    //       symbol: "WBNB",
    //       contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.WBNB
    //     }
    //   ],
    //   withEstimate: false,
    //   arbitrageContract: this.contractFabric.CONFIG[Networks.BSC].ARBITRAGE_V2
    // },
    {
      name: "WBNB/FWC:LUCHOWSWAP/PANCAKE",
      network: Networks.BSC,
      routersData: [
        {
          name: "LUCHOWSWAP",
          router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.LUCHOWSWAP,
          pair: this.contractFabric.luchowswapWBNB_FWCPair
        },
        {
          name: "Pancake",
          router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.PANCAKE,
          pair: this.contractFabric.pancakeWBNB_FWCPair
        }
      ],
      tokens: [
        {
          symbol: "FWC",
          contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.FWC
        },
        {
          symbol: "WBNB",
          contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.WBNB
        }
      ],
      withEstimate: false,
      arbitrageContract: this.contractFabric.CONFIG[Networks.BSC].ARBITRAGE_V2
    }
  ];

  // public readonly arbitrageConfigs: ArbitrageIterationParams[] = [
  //   {
  //     name: "WETH/USDT:ALIUM/UNISWAP",
  //     network: Networks.BSC,
  //     routersData: [
  //       {
  //         name: "Alium_test",
  //         router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.ALIUM_TESTNET,
  //         pair: this.contractFabric.alium_testnetPairsWETH_USDT
  //       },
  //       {
  //         name: "Uniswap_test",
  //         router: this.contractFabric.CONFIG[Networks.BSC].ROUTERS.UNISWAPV2_TEST,
  //         pair: this.contractFabric.uniswapv2_testnetPairsWETH_USDT
  //       }
  //     ],
  //     tokens: [
  //       {
  //         symbol: "USDT",
  //         contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.TEST_USDT_1
  //       },
  //       {
  //         symbol: "WETH",
  //         contract: this.contractFabric.CONFIG[Networks.BSC].TOKENS.TEST_WETH_1
  //       }
  //     ],
  //     withEstimate: false,
  //     arbitrageContract: this.contractFabric.CONFIG[Networks.BSC].ARBITRAGE_V2
  //   }
  // ];
}
