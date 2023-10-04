import { Injectable, Logger } from "@nestjs/common";
import { Interface, Log, TransactionDescription, TransactionResponse } from "ethers";
import uniswapV2RouterAbi from "../abi/uniswapV2/UniswapV2Router.abi.json";
import uniswapV2ERC20Abi from "../abi/uniswapV2/UniswapV2ERC20.json";
import uniswapV2PairAbi from "../abi/uniswapV2/UniswapV2Pair.json";
import { TransactionType } from "../utils/enums";
import { PairSwapDTO, ParseTransactionResponse } from "../dto";

@Injectable()
export class ArbitrageUtils {
  private readonly routerInterface = new Interface(uniswapV2RouterAbi);
  private readonly erc20Interface = new Interface(uniswapV2ERC20Abi);
  private readonly pairInterface = new Interface(uniswapV2PairAbi);

  constructor(private readonly logger: Logger) {
  }

  parseTransaction(transaction: TransactionResponse): ParseTransactionResponse {
    let parsedData: TransactionDescription;
    let dataType: TransactionType;

    try {
      parsedData = this.routerInterface.parseTransaction(transaction);
      dataType = TransactionType.SWAP;
    } catch (e) {
      this.logger.warn("Signature of transaction is not from routers");
    }

    if (!parsedData) {
      try {
        parsedData = this.erc20Interface.parseTransaction(transaction);
        dataType = TransactionType.TRANSFER;
      } catch (e) {
        this.logger.warn("Signature of transaction is not from ERC-20");
      }
    }

    return {
      parsedData,
      dataType
    };
  }

  parseSwapLog(log: Log): PairSwapDTO {
    try {
      const logDescription = this.pairInterface.parseLog({ data: log.data, topics: Array.of(...log.topics) });
      if (logDescription.name === "Swap") {
        return {
          address: log.address,
          sender: logDescription.args.sender,
          to: logDescription.args.to,
          amount0In: logDescription.args?.amount0In ?? BigInt(0),
          amount1In: logDescription.args?.amount1In ?? BigInt(0),
          amount0Out: logDescription.args?.amount0Out ?? BigInt(0),
          amount1Out: logDescription.args?.amount1Out ?? BigInt(0)
        };
      }
    } catch (e) {

    }
  }
}
