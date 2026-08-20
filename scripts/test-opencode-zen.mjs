// ============================================================
// OpenCode Zen 端点诊断脚本
// 用法: node scripts/test-opencode-zen.mjs
// ============================================================

// ==================== 配置区（在这里填） ====================
const API_KEY = ""; // ← 把你的 OpenCode API Key 粘贴到这里
const BASE_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "hy3-free";
// ============================================================

async function request(name, url, options) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const ms = Math.round(performance.now() - start);
    const text = await res.text();
    console.log(`\n=== ${name} ===`);
    console.log(`状态码: ${res.status} ${res.statusText} (${ms}ms)`);
    console.log(`响应头:`);
    for (const [k, v] of res.headers) {
      const kl = k.toLowerCase();
      if (kl.includes("access-control") || kl === "content-type" || kl === "retry-after" || kl === "cf-ray") {
        console.log(`  ${k}: ${v}`);
      }
    }
    console.log(`响应体: ${text.slice(0, 500)}${text.length > 500 ? "..." : ""}`);
    return { status: res.status, text };
  } catch (e) {
    console.log(`\n=== ${name} ===`);
    console.log(`请求失败: ${e.message}`);
    return { status: 0, text: e.message };
  }
}

async function main() {
  console.log("==============================================");
  console.log("OpenCode Zen 端点诊断");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Model:    ${MODEL}`);
  console.log(`API Key:  ${API_KEY ? API_KEY.slice(0, 8) + "..." + API_KEY.slice(-4) : "(未填写!)"}`);
  console.log("==============================================");

  if (!API_KEY) {
    console.log("\n⚠️  请先在脚本顶部的配置区填入你的 API Key，再重新运行。");
    return;
  }

  // 测试1: 模型列表（不带 key，验证 hy3-free 是否在列表里）
  await request("测试1: GET /zen/v1/models (不带key)", "https://opencode.ai/zen/v1/models", {
    headers: { "Content-Type": "application/json" },
  });

  // 测试2: 带 key + hy3-free 非流式
  await request("测试2: POST chat/completions + hy3-free (非流式)", BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], stream: false }),
  });

  // 测试3: 带 key + hy3-free 流式
  await request("测试3: POST chat/completions + hy3-free (流式)", BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], stream: true }),
  });

  // 测试4: 带 key + 付费模型对照（验证 key 本身是否有效）
  await request("测试4: POST chat/completions + deepseek-v4-flash (对照)", BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: "deepseek-v4-flash", messages: [{ role: "user", content: "ping" }], stream: false }),
  });

  // 测试5: 不带 key + hy3-free（对照）
  await request("测试5: POST chat/completions + hy3-free (不带key)", BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ping" }], stream: false }),
  });

  console.log("\n==============================================");
  console.log("诊断完成。把上面的输出发给我，我来分析。");
  console.log("==============================================");
}

main();