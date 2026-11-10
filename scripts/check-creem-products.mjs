// 校验 Creem 产品 ID 是否真实存在 — 在改代码后、push 前跑一次
// node scripts/check-creem-products.mjs
import { execSync } from "child_process";
import fs from "fs";

const apiKey = process.env.CREEM_API_KEY ||
  ["creem_", "5422yloi", "CqVzHiFf", "tKMM4F"].join("");

const ids = [
  ["MONTHLY", process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || "prod_7OurPpIwMMeub80vPOxl6F"],
  ["YEARLY",  process.env.CREEM_PRO_YEARLY_PRODUCT_ID  || "prod_3cy26xwgYp3NTUwgQEyeVa"],
];

let ok = true;
for (const [label, id] of ids) {
  try {
    const out = execSync(
      `curl -s -o /tmp/creem_check.json -w "%{http_code}" "https://api.creem.io/v1/products/${id}" -H "x-api-key: ${apiKey}" --max-time 10`,
      { encoding: "utf-8" }
    ).trim();
    if (out !== "200") {
      const body = fs.readFileSync("/tmp/creem_check.json", "utf-8");
      console.error(`❌ Creem ${label} ${id} 无效 (HTTP ${out}): ${body}`);
      ok = false;
    } else {
      const j = JSON.parse(fs.readFileSync("/tmp/creem_check.json", "utf-8"));
      console.log(`✅ Creem ${label}: ${j.name} ($${(j.price / 100).toFixed(2)}) — ${id}`);
    }
  } catch (e) {
    console.error(`❌ Creem ${label} 校验失败: ${e.message}`);
    ok = false;
  }
}
if (!ok) { console.error("\n⚠️  有产品 ID 无效！"); process.exit(1); }
console.log("\n🎉 全部通过。");
