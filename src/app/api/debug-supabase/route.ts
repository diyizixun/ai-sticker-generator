// Debug Supabase connectivity
import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. 测 Supabase REST API 直连
  try {
    const url = "https://tzrzefthqqbepoedsuji.supabase.co/rest/v1/users?select=email&limit=1";
    const key =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6cnplZnRocXFiZXBvZWRzdWppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg3Nzc0OSwiZXhwIjoyMTAwNDUzNzQ5fQ.9SHgg7hvMgM_jQt47hZ_c8T0Xd3g1rMuw92mHnuwO6w";
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    results.supabase_rest = {
      status: r.status,
      ok: r.ok,
      body: (await r.text()).slice(0, 300),
    };
  } catch (e: any) {
    results.supabase_rest = { error: e.message, name: e.name };
  }

  // 2. 测 DNS / TLS
  try {
    const r = await fetch("https://tzrzefthqqbepoedsuji.supabase.co/", {
      signal: AbortSignal.timeout(5000),
    });
    results.supabase_root = { status: r.status };
  } catch (e: any) {
    results.supabase_root = { error: e.message };
  }

  // 3. 测一个肯定能通的 URL
  try {
    const r = await fetch("https://api.creem.io/v1/products", {
      headers: { "x-api-key": "creem_5422yloiCqVzHiFftKMM4F" },
      signal: AbortSignal.timeout(5000),
    });
    results.creem = { status: r.status };
  } catch (e: any) {
    results.creem = { error: e.message };
  }

  // 4. 检查 env var
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeVersion: process.version,
  };

  return NextResponse.json(results);
}
