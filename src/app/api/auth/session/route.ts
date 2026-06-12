import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/session - check if user is logged in
export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  return NextResponse.json({ email: session || null });
}

// DELETE /api/auth/session - logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
