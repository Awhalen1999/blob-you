import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata: Metadata = {
  title: "blob.you",
  description: "blob.you - kinda cool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" className={fredoka.variable}>
      <body className="tile-bg">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
