import { Injectable } from "@nestjs/common";
import { Networks } from "../utils/constants";

@Injectable()
export class ArbitrageConfigTest {

  private readonly config = {
    pk: "24d08c8e37f247df3297aaea85eedd7d45c311acccacd4c9cd2f19ae06b16963",
    dex_routers: {
      Alium: "0x9F337DC10F14402287449De5444428A98aC63fc9",
      Uniswap: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      Pancake: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    },
    dex_constants: {
      [Networks.BSC]: {
        multicall: "0x1f12Df344B63F1eb20ED661Ac160208266179C49",
        arbitrage: "0x625d5edA89657Bc265E5A9547eF366C84c976E94",
        arbitrageV2: "0x8282dAE85132322E71BC17e98F5aE3C8f17A0C1e",
        alium: {
          router: "0xab81930baA3679551A9c3A219ADd23e38058faBC",
          factory: "0xA198B424AFDa626BCf040b20022A392E53149d79",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555",
            WETH_USDT: "0x496EB44231FA1611F08ffbF9E0D72dBBB32a6464"
          }
        },
        alium_old: {
          router: "0xB0e28C53B7C84741085EFE2e16CFF1d04149848f",
          factory: "0xbEAC7e750728e865A3cb39D5ED6E3A3044ae4B98",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        pancake: {
          router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
          factory: "0x6725f303b657a9451d8ba641348b6761a6cc7a17",
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        uniswapv2: {
          router: "0x723792a3e412FC4ffB9a0ACA0a152bC2D210b957",
          factory: "0xC1989a54019Fa554bFDa43b3077c2a5751ab63A6",
          feeInAmountOut: 997,
          mulNumber: 1000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555",
            WETH_USDT: "0x580bACAb604dE47B40565DB25b99c9A256FA6732"
          }
        },
        test_1: {
          factory: "0xA198B424AFDa626BCf040b20022A392E53149d79",
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        test_2: {
          factory: "0xC1989a54019Fa554bFDa43b3077c2a5751ab63A6",
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        tokens: {
          WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
          ALM: "0x6f58aCfaEB1BfDC9c4959c43aDdE7a3b63BF019f",
          BUSD: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
          USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
          CAKE: "0x9C21123D94b93361a29B2C2EFB3d5CD8B17e0A9e",
          TEST_WETH_1: "0xB8A18D1cE00e6Ffbe2F23813f15Bb2ca6B1E014d",
          TEST_USDT_1: "0x8357A29AB9f9382A927Ffed35bc79a07f491852B",
          ADA: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47" // main
        },
        network: {
          rpc: {
            url: `${process.env.NODE_KEY_RPC}/`,
            id: 97
          },
          ws: {
            url: `${process.env.NODE_KEY_WS}/`,
            id: 97
          }
        },
        scanUrl: "https://testnet.bscscan.com/tx/"
      },
    }
  };

  public get configuration() {
    return this.config;
  }
}
