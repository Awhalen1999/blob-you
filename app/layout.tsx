import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
    <html lang="en">
      <body className={`${poppins.variable} tile-bg`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
