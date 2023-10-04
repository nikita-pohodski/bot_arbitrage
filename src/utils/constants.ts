export const ABI = {
  arbitrage: [
    "function swap(address _routerA, address _routerB, address _profitToken, address _middleToken, uint256 _amountIn) view returns (uint256)",
    "function safeSwap(address _routerA, address _routerB, address _profitToken, address _middleToken, uint256 _amountIn) view returns (uint256)",
    "function getExpectedAmount(address _routerA, address _routerB, address _profitToken, address _middleToken, uint256 _amountIn) view returns (uint256 amountOut)",
    "function getMaximizedProfit(address router, address tokenA, address tokenB, uint256 truePriceTokenA, uint256 truePriceTokenB, uint256 maxSpendTokenA, uint256 maxSpendTokenB) view returns (uint256[] amounts,address[] path,uint256 amountIn,uint256 amountInHypothetical,uint256 profit)",
    "function withdrawToken(address _token, address _account, uint256 _amount) view returns ()"
  ],
  routerV2: [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) view returns (uint256)"
  ]
};

export enum Networks {
  BSC = "bsc",
  POLYGON = "polygon"
}
