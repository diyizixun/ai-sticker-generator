import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (session) {
    return NextResponse.json({ loggedIn: true, email: session });
  }
  return NextResponse.json({ loggedIn: false });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
