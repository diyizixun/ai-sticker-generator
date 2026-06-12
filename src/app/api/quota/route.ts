import { NextRequest, NextResponse } from "next/server";
import { getQuota, FREE_DAILY_LIMIT } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const sessionEmail = req.cookies.get("session")?.value;
  const visitorId = req.cookies.get("visitor_id")?.value;

  let quotaKey: string;
  if (sessionEmail) {
    quotaKey = `user:${sessionEmail}`;
  } else if (visitorId) {
    quotaKey = `visitor:${visitorId}`;
  } else {
    return NextResponse.json({ used: 0, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT });
  }

  return NextResponse.json(getQuota(quotaKey));
}
