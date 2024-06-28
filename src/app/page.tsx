"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits, erc20Abi, encodeFunctionData } from "viem";
import { formatCurrency } from "@coingecko/cryptoformat";
import { useSendCalls } from "wagmi/experimental";

const getTokenBalances = async (address: string) => {
  try {
    const response = await fetch(
      process.env.NODE_ENV === "development"
        ? `http://localhost:3000/api/tokens?address=${address}`
        : `https://sweep-base.vercel.app/api/tokens?address=${address}`,
      { next: { revalidate: 60 } }
    );
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
  const { sendCalls } = useSendCalls();
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<SelectedTokens>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
              slippageTolerance: 10, // 0.1%
            }),
          }
        );
        return res.json();
      });

      const callsArray = await Promise.all(callsPromises);

      // Approve calldata
      const approveCalls = successfulRoutes.map((route) => {
        const amount = route.data.amountIn;

        // Construct calldata
        const approveCalldata = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [address as `0x${string}`, amount],
        });

        return approveCalldata;
      });

      console.log(approveCalls);

      sendCalls({
        calls: callsArray
          .map((call, idx) => {
            return [
              {
                to: call.data.routerAddress as `0x${string}`,
                data: approveCalls[idx],
                value: BigInt(0),
              },
              {
                to: call.data.routerAddress as `0x${string}`,
                data: call.data.data as `0x${string}`,
                value: BigInt(0),
              },
            ];
          })
          .flat(),
      });
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
                  <input
                    type="checkbox"
                    className="toggle toggle-sm checked:[--tglbg:#3e91fd] checked:bg-white checked:border-[#3e91fd]"
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
                      className="input input-bordered input-sm ml-4"
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
            disabled={Object.keys(selectedTokens).length === 0}
          >
            Sweep to ETH
          </button>
        </>
      ) : (
        <p>No tokens found</p>
      )}
    </div>
  );
}

export default App;
