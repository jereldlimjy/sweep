"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits, erc20Abi, encodeFunctionData } from "viem";
import { formatCurrency } from "@coingecko/cryptoformat";
import { useSendCalls } from "wagmi/experimental";

const getTokenBalances = async (address: string) => {
  try {
    const response = await fetch(`/api/tokens?address=${address}`, {
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
};

interface SelectedTokens {
  [tokenAddress: string]: any;
}

function App() {
  const { address } = useAccount();
  const { sendCalls, isPending } = useSendCalls();
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<SelectedTokens>({});
  const [loading, setLoading] = useState(false);

  const fetchTokens = async () => {
    if (address) {
      setLoading(true);
      const data = await getTokenBalances(address);
      setTokens(data);
      setLoading(false);
    } else {
      setTokens([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [address]);

  const handleTokenSelect = (
    tokenAddress: string,
    checked: boolean,
    value: string,
    decimals: number
  ) => {
    if (!checked) {
      const currTokens = { ...selectedTokens };
      delete currTokens[tokenAddress];
      setSelectedTokens(currTokens);
    } else {
      setSelectedTokens((prev) => ({
        ...prev,
        [tokenAddress]: {
          amount: value,
          decimals,
        },
      }));
    }
  };

  const handleSweep = async () => {
    try {
      // Get route information
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

      const routes = await Promise.all(routePromises);

      const successfulRoutes = routes.filter((route) => route.code === 0);

      // Get encoded swap route
      const callsPromises = successfulRoutes.map(async (route) => {
        const res = await fetch(
          "https://aggregator-api.kyberswap.com/base/api/v1/route/build",
          {
            method: "POST",
            body: JSON.stringify({
              routeSummary: route.data.routeSummary,
              sender: address,
              recipient: address,
              slippageTolerance: 100, // 1%
            }),
          }
        );
        return res.json();
      });

      const callsArray = await Promise.all(callsPromises);

      // Approve calls
      const approveCalls = successfulRoutes.map((route) => {
        const amount = route.data.routeSummary.amountIn;
        const routerAddress = route.data.routerAddress;

        // Construct calldata
        const approveCalldata = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [routerAddress as `0x${string}`, amount],
        });

        return {
          to: route.data.routeSummary.tokenIn as `0x${string}`,
          data: approveCalldata,
          value: BigInt(0),
        };
      });

      // Swap calls
      const swapCalls = callsArray.map((call) => {
        return {
          to: call.data.routerAddress as `0x${string}`,
          data: call.data.data as `0x${string}`,
          value: BigInt(0),
        };
      });

      sendCalls(
        {
          calls: [...approveCalls, ...swapCalls],
        },
        {
          onSuccess(data, variables, context) {
            setPendingRefresh(true);
            setTimeout(() => {
              fetchTokens();
              setPendingRefresh(false);
            }, 5000);
          },
        }
      );
    } catch (err) {}
  };

  return (
    <div className="flex flex-col w-full items-center justify-center">
      {loading ? (
        <p>Loading...</p>
      ) : tokens.length > 0 ? (
        <>
          <ul className="space-y-3">
            {tokens.map((token) => (
              <li key={token.token_address}>
                <div className="flex items-center">
                  {/* Disable if price is 0 */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      onChange={(e) =>
                        handleTokenSelect(
                          token.token_address,
                          e.target.checked,
                          formatUnits(token.balance, token.decimals),
                          token.decimals
                        )
                      }
                      disabled={parseFloat(token.usdPrice) === 0}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer-checked:bg-[#3e91fd] peer-checked:border-[#3e91fd] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
                  </label>
                  <span className="ml-3.5">
                    {formatUnits(token.balance, token.decimals)}
                  </span>
                  <span className="ml-2 font-sfrounded-medium">
                    {token.symbol}
                  </span>
                  <span className="ml-2">
                    (worth{" "}
                    {formatCurrency(
                      parseFloat(token.usdPrice) * token.balance_formatted,
                      "USD"
                    )}
                    )
                  </span>
                  {selectedTokens[token.token_address] && (
                    <input
                      className="ml-4 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="number"
                      placeholder="Amount"
                      onChange={(e) =>
                        handleTokenSelect(
                          token.token_address,
                          true,
                          e.target.value,
                          token.decimals
                        )
                      }
                      value={selectedTokens[token.token_address].amount ?? "0"}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            className="mt-4 btn rounded-xl px-4 py-2 bg-gray-200 font-sfrounded-medium tracking-wide enabled:hover:text-gray-50 enabled:hover:bg-[#0e76fd] enabled:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSweep}
            disabled={Object.keys(selectedTokens).length === 0 || isPending}
          >
            {isPending || pendingRefresh ? (
              <div className="flex items-center">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 animate-spin text-gray-200 fill-gray-500"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="ml-2">Sweeping...</span>
              </div>
            ) : (
              <span> Sweep to ETH</span>
            )}
          </button>
        </>
      ) : (
        <p>No tokens found</p>
      )}
    </div>
  );
}

export default App;
