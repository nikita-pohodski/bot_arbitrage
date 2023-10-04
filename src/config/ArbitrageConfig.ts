import { Injectable } from "@nestjs/common";
import { Networks } from "../utils/constants";

@Injectable()
export class ArbitrageConfig {

  readonly config = {
    pk: process.env.WALLET_PK,
    dex_routers: {
      Alium: "0xd646E168D59B317036D97971183a35223d31f7ef",
      Uniswap: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      Pancake: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    },
    dex_constants: {
      [Networks.BSC]: {
        // multicall: "0x1f12Df344B63F1eb20ED661Ac160208266179C49", //testnet
        // arbitrageV2: "0x8282dAE85132322E71BC17e98F5aE3C8f17A0C1e", //testnet
        multicall: "0x603bC4530ad41153859Bd4c0AE1FBa4D10660299",
        arbitrageV2: "0xAc2CE68B43D0827B76Eb881B3a9719AFceC441B3",
        arbitrage: "0x52bACd12A0e9C6376f6A6789A9F3d6Fd19c4F202",
        alium: {
          router: "0xd646E168D59B317036D97971183a35223d31f7ef",
          factory: "0x89Aab5f151D9f6568EACB218824ACc3431b752Ee",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        alium_old: {
          router: "0xB0e28C53B7C84741085EFE2e16CFF1d04149848f",
          factory: "0xbEAC7e750728e865A3cb39D5ED6E3A3044ae4B98",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0x92f12720733c626e3bea3a35a9bd6151ed12ff92"
          }
        },
        pancake: {
          router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
          factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0x69dd3db8e74ba47c2f06899040a9d30825ad5b31",
            MONI_WBNB: "0xbcfd0d4a37feb4dceaaefa9da28cd833e5f04e9f",
            PAIU_WBNB: "0x5431afe2affb5ea6dfc1236de28bd8ed4bcbc41d",
            FWC_WBNB: "0x32dea04d0579387f869e26c7e051dd80b24d76c0",
            BABY_WBNB: "0xad1bfa8b34e6f6e63972d47667712f36061d955b"
          }
        },
        luchowswap: {
          router: "0x34A24969C54fF1172879Dd993dec307a4a83A674",
          factory: "0xaF042b1B77240063bc713B9357c39ABedec1b691",
          feeInAmountOut: 998,
          mulNumber: 1000,
          pairs: {
            FWC_WBNB: "0x083b3cc2a69d5997e28190887c44610267515202"
          }
        },
        uniswapv2: {//testnet
          router: "0x723792a3e412FC4ffB9a0ACA0a152bC2D210b957",
          factory: "0xC1989a54019Fa554bFDa43b3077c2a5751ab63A6",
          feeInAmountOut: 997,
          mulNumber: 1000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555"
          }
        },
        uniswapv2_testnet: {
          router: "0x723792a3e412FC4ffB9a0ACA0a152bC2D210b957",
          factory: "0xC1989a54019Fa554bFDa43b3077c2a5751ab63A6",
          feeInAmountOut: 997,
          mulNumber: 1000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555",
            WETH_USDT: "0x580bACAb604dE47B40565DB25b99c9A256FA6732"
          }
        },
        alium_testnet: {
          router: "0xab81930baA3679551A9c3A219ADd23e38058faBC",
          factory: "0xA198B424AFDa626BCf040b20022A392E53149d79",
          feeInAmountOut: 9975,
          mulNumber: 10000,
          pairs: {
            ALM_WBNB: "0xd862618c15d10d67e6f0187e7d7e94e292ba5555",
            WETH_USDT: "0x496EB44231FA1611F08ffbF9E0D72dBBB32a6464"
          }
        },
        apeswap: {
          router: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
          factory: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
          feeInAmountOut: 997,
          mulNumber: 1000,
          pairs: {
            MONI_WBNB: "0xe89dff611f926b86293a8e0e6f1c384c6ae0cb69",
            PAIU_WBNB: "0x52662e5db80e67b5230367050a2b35507f6e751a"
          }
        },
        babyswap: {
          router: "0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd",
          factory: "0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da",
          feeInAmountOut: 997,
          mulNumber: 1000,
          pairs: {
            BABY_WBNB: "0x36ae10a4d16311959b607ee98bc4a8a653a33b1f"
          }
        },
        tokens: {
          WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          ALM: "0x7C38870e93A1f959cB6c533eB10bBc3e438AaC11",
          USDT: "0x55d398326f99059fF775485246999027B3197955",
          CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
          BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
          USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
          UNI: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
          LQT: "0xBD2C43Da85d007B0b3cd856FD55c299578D832bC",
          WSI: "0x837A130aED114300Bab4f9f1F4f500682f7efd48",
          GAMER: "0xADCa52302e0a6c2d5D68EDCdB4Ac75DeB5466884",
          ADA: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47",
          MICRO: "0xd05B1cFf02b5955c8D1CECeD2fE12eD12804974D",
          YES: "0xB9d35811424600fa9E8cD62A0471fBd025131cb8",
          TWT: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
          MONI: "0x9573c88ae3e37508f87649f87c4dd5373c9f31e0",
          PAIU: "0x9aeb2e6dd8d55e14292acfcfc4077e33106e4144",
          FWC: "0x6d3a160b86edcd46d8f9bba25c2f88cccade19fc",
          BABY: "0x53e562b9b7e5e94b81f10e96ee70ad06df3d2657",
          TEST_WETH_1: "0xB8A18D1cE00e6Ffbe2F23813f15Bb2ca6B1E014d",//testnet
          TEST_USDT_1: "0x8357A29AB9f9382A927Ffed35bc79a07f491852B"//testnet
        },
        network: {
          rpc: {
            url: `${process.env.NODE_KEY_RPC}`,
            id: Number(`${process.env.NODE_NETWORK_ID}`),
          },
          ws: {
            url: `${process.env.NODE_KEY_WS}`,
            id: Number(`${process.env.NODE_NETWORK_ID}`),
          }
        },
        scanUrl: "https://bscscan.com/tx/"
      },
      [Networks.POLYGON]: {
        multicall: "0x983b4625630ae1aaa7648f4cad68b9c0a52b8ae8",
        arbitragev2: "0x6CC56eB273e839386212533b693F34cBbd9862B6",
        uniswap: {
          router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
          factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
          quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        },
        tokens: {
          MATIC: "0x0000000000000000000000000000000000001010",
          WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
          CYBR: "0x728D06c26bE85eBc8efA334453863B1Df00Ec493",
          USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
        },
        network: {
          rpc: {
            url: `${process.env.NODE_KEY_POLYGON_RPC}`,
            id: 137
          },
          ws: {
            url: `${process.env.NODE_KEY_POLYGON_WS}`,
            id: 137
          }
        },
        scanUrl: "https://polygonscan.com/tx/"
      }
    }
  };

  public get configuration() {
    return this.config;
  }
}
