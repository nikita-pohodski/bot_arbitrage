import {
  Contract,
  formatUnits,
  JsonRpcProvider,
  parseEther,
  parseUnits,
  resolveProperties,
  Transaction,
  Wallet
} from "ethers";
import routerAbi from "../abi/uniswapV2/UniswapV2Router.abi.json";
import erc20Abi from "../abi/uniswapV2/UniswapV2ERC20.json";

describe("Arbitrage tests", () => {
  const smartRouterAddress = "0x723792a3e412FC4ffB9a0ACA0a152bC2D210b957";
  const usdtAddress = "0xB8A18D1cE00e6Ffbe2F23813f15Bb2ca6B1E014d";
  const wethAddress = "0x8357A29AB9f9382A927Ffed35bc79a07f491852B";
  // const usdtAddress = "0x8357A29AB9f9382A927Ffed35bc79a07f491852B";
  // const wethAddress = "0xB8A18D1cE00e6Ffbe2F23813f15Bb2ca6B1E014d";
  const signerAddress = "0x8dfd3adbbdc4db2fd4e0e447dff1e8147c0cc27c";
  const signerPk = "key";

  const provider = new JsonRpcProvider("https://nd-802-064-893.p2pify.com/key", 97);
  const signer = new Wallet(signerPk, provider);
  const wethContract = new Contract(wethAddress, erc20Abi, signer);
  const usdtContract = new Contract(usdtAddress, erc20Abi, signer);
  const smartRouterContract = new Contract(smartRouterAddress, routerAbi, signer);

  let nonceInCache;
  const amount = "3930";

  beforeAll(() => {
    getBalances();
  });

  describe("approve", () => {
    it("Should return hash", async () => {
      const contractTransactionResponse = await wethContract
        .getFunction("approve")
        .send(smartRouterAddress, parseUnits(amount) * BigInt(2000) / BigInt(100));
      // const contractTransactionReceipt = await contractTransactionResponse.wait(1);

      expect(contractTransactionResponse.hash.length).toBeGreaterThan(0);
    });
  });


  describe("sendTransaction", () => {
    it("should return end at ms", async () => {
      expect(await swap(amount)).toBeGreaterThan(0);
    });
  });

  async function swap(amountInString) {
    console.log("-------------------------");
    const amountIn = parseEther(amountInString);

    const getFrom = Date.now();
    const [amountsOutResult, nonce, feeData] = await Promise.all([
      await smartRouterContract.getFunction("getAmountsOut").staticCallResult(amountIn, [wethAddress, usdtAddress, wethAddress]),
      signer.getNonce(),
      provider.getFeeData(),
      provider._getBlockTag()
    ]);
    console.log(`All get requests end at ${Date.now() - getFrom} ms`);

    const params = {
      amountIn: amountIn,
      amountOutMin: amountsOutResult[0][1] * BigInt(90) / BigInt(100),
      path: [wethAddress, usdtAddress],
      to: signerAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      gas: { gasPrice: parseUnits("6", "gwei"), gasLimit: 1000000 }
    };

    const fromPopulate = Date.now();
    const populate = await smartRouterContract.getFunction("swapExactTokensForTokens").populateTransaction(params.amountIn, params.amountOutMin, params.path, params.to, params.deadline);
    const endPopulate = Date.now() - fromPopulate;
    console.log(`Populate transaction end at ${endPopulate} ms`);

    const fromResolveProp = Date.now();
    const wrapTransaction = {
      ...feeData,
      to: populate.to,
      data: populate.data,
      from: signerAddress,
      chainId: 97,
      gasLimit: BigInt(1000000),
      gasPrice: parseUnits("6", "gwei"),
      nonce: nonceInCache ?? nonce,
      type: 0,
      value: BigInt(0)
    };

    const stringTransactionLike = await resolveProperties(wrapTransaction);

    const endResolveProp = Date.now() - fromResolveProp;
    console.log(`Resolve tx properties end at ${endResolveProp} ms`);

    const fromMapObjToTx = Date.now();
    delete stringTransactionLike.from;
    const transaction = Transaction.from(stringTransactionLike);
    const endMapObjToTx = Date.now() - fromMapObjToTx;
    console.log(`Map obj to Transaction end at ${endMapObjToTx} ms`);

    const fromSign = Date.now();
    const signedTx = await signer.signTransaction(transaction);
    const endSign = Date.now() - fromSign;
    console.log(`Sign transaction at ${endSign} ms`);

    const from = Date.now();
    const transactionResponse = await provider.broadcastTransaction(signedTx);
    nonceInCache = nonce + 1;
    const endAt = Date.now() - from;
    console.log(`Broadcast (send) at ${endAt} ms`);

    // await transactionResponse.wait(1);

    console.log("-------------------------");
    return endAt + endSign + endMapObjToTx + endResolveProp + endPopulate;
  }


  async function getBalances() {
    const [ethBalance, wethBalance, usdtBalance] = await Promise.all([
      provider.getBalance(signerAddress),
      wethContract.getFunction("balanceOf").staticCallResult(signerAddress),
      usdtContract.getFunction("balanceOf").staticCallResult(signerAddress)
    ]);

    console.log("Eth balance:", formatUnits(ethBalance.toString(), 18));
    console.log("wethBalance:", formatUnits(wethBalance[0].toString(), 18));
    console.log("usdtBalance:", formatUnits(usdtBalance.toString(), 18));
  }
});
