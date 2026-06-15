/**
 * Setup script: Creates Supabase tables and gives instructions for deployment
 * Run: node scripts/setup.js
 */

const { createClient } = require("@supabase/supabase-js");
const { execSync } = require("child_process");

const SUPABASE_URL = "https://ghxqnpserqvrspganlqk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeHFucHNlcnF2cnNwZ2FubHFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA0NzYwNSwiZXhwIjoyMDk0NjIzNjA1fQ.QZm82jlINQqhygGTy8x5P4EG_3GB29YdrhQwUPfmusQ";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function setupUsersTable() {
  console.log("📋 Creating users table...");
  const { error } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS public.users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
    `
  });

  if (error) {
    console.log("⚠️  RPC method not available, trying raw SQL via REST...");
    // Fallback: try direct SQL query
    const { error: sqlError } = await supabase.from("users").insert({
      email: "_test_setup@example.com",
    }).select().single();

    if (sqlError && !sqlError.message.includes("already exists") && !sqlError.message.includes("duplicate")) {
      console.error("❌ Failed to create users table:", sqlError.message);
      console.log("   Please run supabase-schema.sql manually:");
      console.log("   https://supabase.com/dashboard/project/ghxqnpserqvrspganlqk/sql/new");
      return false;
    }
  }

  console.log("✅ Users table ready!");
  return true;
}

async function main() {
  console.log("=== AI Sticker Setup ===\n");

  // Step 1: Create tables
  const tableOk = await setupUsersTable();

  // Step 2: Deploy
  console.log("\n🚀 Deploying to Vercel...");
  console.log("   (make sure you have VERCEL_TOKEN set)\n");

  try {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      console.log("❌ VERCEL_TOKEN not set.");
      console.log("   Get it from: https://vercel.com/account/tokens");
      console.log("   Then run: export VERCEL_TOKEN=your_token");
      console.log("   Then: npx vercel deploy --prod");
      process.exit(1);
    }

    execSync(
      `npx vercel deploy --prod --yes --token ${token}`,
      { stdio: "inherit", cwd: __dirname + "/.." }
    );

    console.log("\n✅ Deployed! Visit https://www.aisticker.pics");
  } catch (e) {
    console.log("\n⚠️  Deployment via script failed.");
    console.log("   Deploy manually:");
    console.log("   1. Install Vercel CLI: npm i -g vercel");
    console.log("   2. Login: vercel login");
    console.log("   3. Deploy: vercel deploy --prod");
  }
}

main().catch(console.error);
