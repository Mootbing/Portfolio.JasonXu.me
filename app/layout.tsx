import type { Metadata } from "next";
import { Playfair_Display, Montserrat, Caveat } from "next/font/google";
import "./globals.css";
import BlobCursor from "./components/BlobCursor";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jason Xu | Everything I've Built",
  description:
    "Jason Xu - Builder, Entrepreneur, and Student at the University of Pennsylvania",
  keywords: [
    "Jason Xu",
    "entrepreneur",
    "developer",
    "University of Pennsylvania",
  ],
  authors: [{ name: "Jason Xu" }],
  creator: "Jason Xu",
  openGraph: {
    title: "Jason Xu | Everything I've Built",
    description:
      "Builder, Entrepreneur, and Student at the University of Pennsylvania",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfairDisplay.variable} ${montserrat.variable} ${caveat.variable} antialiased`}
      >
        <BlobCursor />
        {children}
      </body>
    </html>
  );
}
