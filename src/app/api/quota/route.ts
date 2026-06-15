import { NextRequest, NextResponse } from "next/server";
import { getClientId, checkQuota } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const clientId = getClientId(req);
  const quota = checkQuota(clientId);
  return NextResponse.json({
    allowed: quota.allowed,
    remaining: quota.remaining,
    limit: quota.limit,
  });
}
