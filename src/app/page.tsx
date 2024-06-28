"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { formatCurrency } from "@coingecko/cryptoformat";

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
  [tokenAddress: string]: string;
}

function App() {
  const { address } = useAccount();
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
    value: string
  ) => {
    if (!checked) {
      const currTokens = { ...selectedTokens };
      delete currTokens[tokenAddress];
      setSelectedTokens(currTokens);
    } else {
      setSelectedTokens((prev) => ({
        ...prev,
        [tokenAddress]: value,
      }));
    }
  };

  const handleSweep = async () => {};

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
                        formatUnits(token.balance, token.decimals)
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
                          e.target.value
                        )
                      }
                      value={selectedTokens[token.token_address] ?? "0"}
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
