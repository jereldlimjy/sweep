"use client";
import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
// import { coinbaseWallet } from "wagmi/connectors";
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
    projectId: "YOUR_PROJECT_ID",
  }
);

export function getConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors,
    transports: {
      [baseSepolia.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
