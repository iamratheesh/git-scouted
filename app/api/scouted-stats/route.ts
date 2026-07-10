import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Fetch total unique scouted cards count
    const totalCreated = await db.collection("scouted_users").countDocuments();

    // 2. Fetch sum of search count (total card ratings)
    const ratingSumResult = await db
      .collection("scouted_users")
      .aggregate([{ $group: { _id: null, total: { $sum: "$count" } } }])
      .toArray();
    
    const totalRated = ratingSumResult[0]?.total || 0;

    // 3. Fetch up to 12 latest avatars
    const recentUsers = await db
      .collection("scouted_users")
      .find({}, { projection: { avatarUrl: 1 } })
      .sort({ lastScoutedAt: -1 })
      .limit(12)
      .toArray();

    const latestAvatars = recentUsers
      .map((user) => user.avatarUrl)
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    return NextResponse.json({
      totalCreated,
      totalRated,
      latestAvatars,
    });
  } catch (err) {
    console.error("[MongoDB] Failed to retrieve scouted stats:", err);
    // Graceful fallback values so UI continues to function perfectly
    return NextResponse.json({
      totalCreated: 0,
      totalRated: 0,
      latestAvatars: [],
    });
  }
}
