import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchTracks } from "@/lib/spotify";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchTracks(q, 8);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Track search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
