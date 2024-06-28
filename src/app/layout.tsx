import "./globals.css";
import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Sweep",
  description: "Sweep multiple tokens at once on Base",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sfrounded">
        <Providers>
          <Navbar />
          <div className="my-8">{props.children}</div>
        </Providers>
      </body>
    </html>
  );
}
