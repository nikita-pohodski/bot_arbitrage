import { Injectable } from "@nestjs/common";
import { ERC20TokenContract, MyRpcProvider, MyWebSocketProvider, PairV2Contract, RouterV2Contract } from "../contracts";
import { Networks } from "../utils/constants";
import { ArbitrageConfig } from "../config/ArbitrageConfig";
import { ArbitrageWallet } from "../services/ArbitrageWallet";
import { ArbitrageContract } from "../contracts/ArbitrageContract";

@Injectable()
export class ContractFabric {
  constructor(
    private readonly arbitrageConfig: ArbitrageConfig
  ) {
  }

  public readonly bscConfiguration = this.arbitrageConfig.configuration.dex_constants[Networks.BSC];
  public readonly polygonConfiguration = this.arbitrageConfig.configuration.dex_constants[Networks.POLYGON];

  public readonly bscRpcProv = new MyRpcProvider(this.bscConfiguration.network.rpc);
  public readonly bscWssProv = new MyWebSocketProvider(this.bscConfiguration.network.ws);

  public readonly polygonRpcProv = new MyRpcProvider(this.polygonConfiguration.network.rpc);
  public readonly polygonWssProv = new MyWebSocketProvider(this.polygonConfiguration.network.ws);

  public readonly signerBsc: ArbitrageWallet = new ArbitrageWallet(this.arbitrageConfig.configuration.pk, this.bscRpcProv);
  public readonly signerPolygon: ArbitrageWallet = new ArbitrageWallet(this.arbitrageConfig.configuration.pk, this.polygonRpcProv);


  public CONFIG = {
    [Networks.BSC]: {
      gasLimit: 400000,
      providers: {
        rpc: this.bscRpcProv,
        wss: this.bscWssProv
      },
      TOKENS: {
        WBNB: new ERC20TokenContract(this.bscConfiguration.tokens.WBNB, this.signerBsc.instance),
        ALM: new ERC20TokenContract(this.bscConfiguration.tokens.ALM, this.signerBsc.instance),
        MONI: new ERC20TokenContract(this.bscConfiguration.tokens.MONI, this.signerBsc.instance),
        PAIU: new ERC20TokenContract(this.bscConfiguration.tokens.PAIU, this.signerBsc.instance),
        FWC: new ERC20TokenContract(this.bscConfiguration.tokens.FWC, this.signerBsc.instance),
        BABY: new ERC20TokenContract(this.bscConfiguration.tokens.BABY, this.signerBsc.instance),
        TEST_WETH_1: new ERC20TokenContract(this.bscConfiguration.tokens.TEST_WETH_1, this.signerBsc.instance),
        TEST_USDT_1: new ERC20TokenContract(this.bscConfiguration.tokens.TEST_USDT_1, this.signerBsc.instance)
      },
      ROUTERS: {
        ALIUM: new RouterV2Contract(this.bscConfiguration.alium.router, this.signerBsc.instance, this.bscConfiguration, "alium"),
        ALIUM_OLD: new RouterV2Contract(this.bscConfiguration.alium_old.router, this.signerBsc.instance, this.bscConfiguration, "alium_old"),
        PANCAKE: new RouterV2Contract(this.bscConfiguration.pancake.router, this.signerBsc.instance, this.bscConfiguration, "pancake"),
        UNISWAP_V2: new RouterV2Contract(this.bscConfiguration.uniswapv2.router, this.signerBsc.instance, this.bscConfiguration, "uniswapv2"),
        APESWAP: new RouterV2Contract(this.bscConfiguration.apeswap.router, this.signerBsc.instance, this.bscConfiguration, "apeswap"),
        LUCHOWSWAP: new RouterV2Contract(this.bscConfiguration.luchowswap.router, this.signerBsc.instance, this.bscConfiguration, "luchowswap"),
        BABYSWAP: new RouterV2Contract(this.bscConfiguration.babyswap.router, this.signerBsc.instance, this.bscConfiguration, "babyswap"),
        ALIUM_TESTNET: new RouterV2Contract(this.bscConfiguration.alium_testnet.router, this.signerBsc.instance, this.bscConfiguration, "alium_testnet"),
        UNISWAPV2_TEST: new RouterV2Contract(this.bscConfiguration.uniswapv2_testnet.router, this.signerBsc.instance, this.bscConfiguration, "uniswapv2_testnet")
      },
      ARBITRAGE_V2: new ArbitrageContract(this.bscConfiguration.arbitrageV2, this.signerBsc.instance)
    },
    [Networks.POLYGON]: {
      gasLimit: 230000,
      providers: {
        rpc: this.polygonRpcProv,
        wss: this.polygonWssProv
      },
      TOKENS: {
        WBNB: new ERC20TokenContract(this.polygonConfiguration.tokens.WMATIC, this.signerPolygon.instance),
        ALM: new ERC20TokenContract(this.polygonConfiguration.tokens.CYBR, this.signerPolygon.instance),
        MONI: new ERC20TokenContract(this.polygonConfiguration.tokens.USDT, this.signerPolygon.instance)
      },
      ROUTERS: {
        UNISWAP: new RouterV2Contract(this.polygonConfiguration.uniswap.router, this.signerPolygon.instance, this.polygonConfiguration, "uniswap")
      },
      ARBITRAGE_V2: new ArbitrageContract(this.polygonConfiguration.arbitragev2, this.signerPolygon.instance)
    }
  };

  public readonly aliumWBNB_ALMPair = PairV2Contract.getPairContract(this.bscConfiguration.alium.pairs.ALM_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);
  public readonly pancakeWBNB_ALMPair = PairV2Contract.getPairContract(this.bscConfiguration.pancake.pairs.ALM_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);
  public readonly alium_oldWBNB_ALMPair = PairV2Contract.getPairContract(this.bscConfiguration.alium_old.pairs.ALM_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);

  public readonly pancakeWBNB_FWCPair = PairV2Contract.getPairContract(this.bscConfiguration.pancake.pairs.FWC_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);
  public readonly luchowswapWBNB_FWCPair = PairV2Contract.getPairContract(this.bscConfiguration.luchowswap.pairs.FWC_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);

  public readonly pancakeWBNB_BABYPair = PairV2Contract.getPairContract(this.bscConfiguration.pancake.pairs.BABY_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);
  public readonly babyswapWBNB_BABYPair = PairV2Contract.getPairContract(this.bscConfiguration.babyswap.pairs.BABY_WBNB, this.CONFIG[Networks.BSC].providers.rpc.instance);

  public readonly alium_testnetPairsWETH_USDT = PairV2Contract.getPairContract(this.bscConfiguration.alium_testnet.pairs.WETH_USDT, this.CONFIG[Networks.BSC].providers.rpc.instance);
  public readonly uniswapv2_testnetPairsWETH_USDT = PairV2Contract.getPairContract(this.bscConfiguration.uniswapv2_testnet.pairs.WETH_USDT, this.CONFIG[Networks.BSC].providers.rpc.instance);
}
