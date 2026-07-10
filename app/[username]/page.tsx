import type { Metadata } from "next";
import { headers } from "next/headers";
import UserProfileCardPage from "@/components/UserProfileCardPage";

type Props = {
  params: { username: string };
  searchParams: { frame?: string };
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const username = params.username.trim();
  const frameKey = searchParams.frame || "red";
  const title = `@${username} | GitHub Player Card`;
  const description = `Check out @${username}'s custom World Cup–style GitHub player card. Get rated on contributions, consistency, and dev impact!`;

  const ogImageUrl = `${baseUrl}/api/og/${username}?frame=${frameKey}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `@${username}'s GitHub Player Card Deck`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function UsernamePage({ params }: Props) {
  return <UserProfileCardPage username={params.username} />;
}
