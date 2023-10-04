import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";

export type MEVResponse = { result: { bundleHash: string; totalGasUsed: number; stateBlockNumber: number; bundleGasPrice: string; gasFees: string; results: ({ gasUsed: number; fromAddress: string; gasFees: string; toAddress: string; txHash: string; value: string; gasPrice: string })[] }; id: string; jsonrpc: string };
export type BloXRouterInfo = { result: { backrunme_address: string }; id: string; jsonrpc: string };


@Injectable()
export class BloXRouteApi {
  constructor(
    private readonly httpService: HttpService
  ) {
  }

  public async getBloXRouterInfo() {
    return this.httpService.post<BloXRouterInfo>("https://backrunme.blxrbdn.com",
      {
        method: "blxr_info",
        id: `${process.env.BLOXROUTE_ID}`,
        params: {}
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${process.env.BLOXROUTE_AUTH}`
        }
      }
    );
  }

  public async sendBathTransactions(transactionsWithoutPrefix: Array<string>, blockNumber: string) {
    return this.httpService.post<MEVResponse>("https://mev.api.blxrbdn.com",
      {
        method: "blxr_submit_bundle",
        id: `${process.env.BLOXROUTE_ID}`,
        params: {
          transaction: transactionsWithoutPrefix,
          block_number: blockNumber,
          // state_block_number: "latest",
          // timestamp: 1617806320,
          blockchain_network: "BSC-Mainnet"
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${process.env.BLOXROUTE_AUTH}`
        }
      }
    );
  }

  public async sendBathSimulateTransactions(transactionsWithoutPrefix: Array<string>, blockNumber: string) {
    return this.httpService.post<MEVResponse>("https://mev.api.blxrbdn.com",
      {
        method: "blxr_simulate_bundle",
        id: `${process.env.BLOXROUTE_ID}`,
        params: {
          transaction: transactionsWithoutPrefix,
          block_number: blockNumber,
          state_block_number: "latest",
          // timestamp: 1617806320,
          blockchain_network: "BSC-Mainnet"
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${process.env.BLOXROUTE_AUTH}`
        }
      }
    );
  }
}
