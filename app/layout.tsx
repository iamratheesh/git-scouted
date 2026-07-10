import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Player Card Generator | Scout Your Dev World Cup Profile",
  description: "Turn your GitHub profile into a World Cup–style player card. Get rated on coding, open-source contributions, consistency, and developer impact.",
  keywords: [
    "GitHub Player Card",
    "GitHub stats card",
    "FIFA card generator",
    "developer card",
    "git scout",
    "GitHub rating",
    "GitHub stats",
    "dev world cup",
    "coding stats card"
  ],
  authors: [{ name: "@iamratheesh" }],
  openGraph: {
    title: "GitHub Player Card Generator | Scout Your Dev World Cup Profile",
    description: "Turn your GitHub profile into a World Cup–style player card. Get rated on coding, open-source contributions, consistency, and developer impact.",
    siteName: "GitHub Player Card Generator",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Player Card Generator | Scout Your Dev World Cup Profile",
    description: "Turn your GitHub profile into a World Cup–style player card. Get rated on coding, open-source contributions, consistency, and developer impact.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
