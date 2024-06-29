import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "Sweep",
  description: "Sweep multiple tokens at once on Base",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sfrounded">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="my-8 flex-grow">{props.children}</div>
            <Footer />
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
