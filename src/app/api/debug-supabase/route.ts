// Debug Supabase connectivity - verbose version
import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, any> = {};
  const url = "https://ghxqnpserqvrspganlqk.supabase.co/rest/v1/";
  const key = "sb_publishable_MLB2XXObPDlAHIF-hZma7Q_18LWWPZ2";

  // Test 1: basic fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    results.fetch_rest = {
      status: r.status,
      ok: r.ok,
      body: (await r.text()).slice(0, 500),
    };
  } catch (e: any) {
    results.fetch_rest = {
      error: e.message,
      name: e.name,
      stack: e.stack?.split("\n").slice(0, 3),
    };
  }

  // Test 2: DNS + TCP via https.request
  try {
    const https = require("https");
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: "GET",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        timeout: 5000,
      },
      (res: any) => {
        results.https_req = {
          status: res.statusCode,
          headers: { ...res.headers },
        };
      }
    );
    req.on("error", (e: any) => {
      results.https_req = { error: e.message, code: e.code };
    });
    req.on("timeout", () => {
      results.https_req = { error: "timeout" };
      req.destroy();
    });
    req.end();
    // wait a bit
    await new Promise((r) => setTimeout(r, 6000));
  } catch (e: any) {
    results.https_req = { error: e.message };
  }

  // Test 3: simple URL test (no auth)
  try {
    const r = await fetch("https://ghxqnpserqvrspganlqk.supabase.co/", {
      signal: AbortSignal.timeout(5000),
    });
    results.root = { status: r.status };
  } catch (e: any) {
    results.root = { error: e.message };
  }

  // Test 4: test creem
  try {
    const r = await fetch("https://api.creem.io/v1/products", {
      headers: { "x-api-key": "creem_5422yloiCqVzHiFftKMM4F" },
      signal: AbortSignal.timeout(5000),
    });
    results.creem = { status: r.status };
  } catch (e: any) {
    results.creem = { error: e.message };
  }

  return NextResponse.json(results);
}
