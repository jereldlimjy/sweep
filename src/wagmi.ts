"use client";
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";

// Enable Coinbase Smart Wallet
coinbaseWallet.preference = "smartWalletOnly";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [coinbaseWallet],
    },
  ],
  {
    appName: "Sweep",
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID ?? "",
  }
);

export function getConfig() {
  return createConfig({
    chains: [base],
    connectors,
    transports: {
      [base.id]: http(),
    },
    ssr: true,
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
