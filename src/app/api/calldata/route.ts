import { NextRequest, NextResponse } from "next/server";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";

const getRoutes = async (selectedTokens: any, address: string) => {
  const routePromises = Object.keys(selectedTokens).map(
    async (tokenAddress) => {
      const queryParam = new URLSearchParams({
        tokenIn: tokenAddress,
        tokenOut: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        amountIn: parseUnits(
          selectedTokens[tokenAddress].amount,
          selectedTokens[tokenAddress].decimals
        ).toString(),
      });
      const res = await fetch(
        `https://aggregator-api.kyberswap.com/base/api/v1/routes?${queryParam.toString()}`
      );
      return res.json();
    }
  );

  return await Promise.all(routePromises);
};

const getCalls = async (successfulRoutes: any[], address: string) => {
  const callsPromises = successfulRoutes.map(async (route) => {
    const res = await fetch(
      "https://aggregator-api.kyberswap.com/base/api/v1/route/build",
      {
        method: "POST",
        body: JSON.stringify({
          routeSummary: route.data.routeSummary,
          sender: address,
          recipient: address,
          slippageTolerance: 10, // 0.1%
        }),
      }
    );
    return res.json();
  });

  return await Promise.all(callsPromises);
};

export async function POST(req: NextRequest) {
  try {
    const { address, selectedTokens } = await req.json();

    const routes = await getRoutes(selectedTokens, address);
    const successfulRoutes = routes.filter((route) => route.code === 0);

    const callsArray = await getCalls(successfulRoutes, address);

    const approveCalls = successfulRoutes.map((route) => {
      const amount = route.data.amountIn;

      const approveCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [route.data.tokenAddress as `0x${string}`, amount],
      });

      return {
        to: route.data.tokenAddress as `0x${string}`,
        data: approveCalldata,
        value: BigInt(0),
      };
    });

    const swapCalls = callsArray.map((call) => ({
      to: call.data.routerAddress as `0x${string}`,
      data: call.data.data as `0x${string}`,
      value: BigInt(0),
    }));

    return NextResponse.json([...approveCalls, ...swapCalls]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
