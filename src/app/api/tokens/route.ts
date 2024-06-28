import { NextRequest, NextResponse } from "next/server";

const GECKO_TERMINAL_ENDPOINT =
  "https://api.geckoterminal.com/api/v2/networks/base/tokens/multi";

const getTokenBalances = async (address: string) => {
  try {
    let cursor = null;
    let allTokens: any[] = [];
    const queryParams = new URLSearchParams({
      chain: "base",
      exclude_spam: "true",
      exclude_native: "true",
    });

    do {
      if (cursor) {
        queryParams.set("cursor", cursor);
      }

      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?${queryParams.toString()}`,
        {
          headers: {
            "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY ?? "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      allTokens = allTokens.concat(data.result);
      cursor = data.cursor;
    } while (cursor);

    return allTokens;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const fetchTokenPrices = async (tokenAddresses: string[]) => {
  try {
    const chunks = [];
    for (let i = 0; i < tokenAddresses.length; i += 30) {
      chunks.push(tokenAddresses.slice(i, i + 30));
    }

    let priceMap = {};
    for (const chunk of chunks) {
      const response = await fetch(
        `${GECKO_TERMINAL_ENDPOINT}/${chunk.join(",")}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch token prices");
      }

      const data = (await response.json()).data;

      const geckoTerminalDataMap = data.reduce((acc: any, curr: any) => {
        const attributes = curr.attributes;
        return {
          ...acc,
          [attributes.address]: attributes.price_usd,
        };
      }, {});

      priceMap = {
        ...priceMap,
        ...geckoTerminalDataMap,
      };
    }

    return priceMap;
  } catch (err) {
    console.error(err);
    return {};
  }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const tokens = await getTokenBalances(address);

  // Fetch price data from Gecko Terminal
  const tokenAddresses = tokens.map((token: any) => token.token_address);
  const prices: any = await fetchTokenPrices(tokenAddresses);

  const tokensWithPrices = tokens.map((token: any) => ({
    ...token,
    usdPrice: prices[token.token_address] ?? 0,
  }));

  return NextResponse.json(tokensWithPrices);
}
