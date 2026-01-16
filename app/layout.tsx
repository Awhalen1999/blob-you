import type { Metadata } from "next";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";


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
      <body className="tile-bg">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
