#!/usr/bin/env node
/**
 * scripts/test-api.mjs
 * Manual smoke-test for the AI provider connection.
 * Reads credentials from .dev.vars — never hardcode secrets here.
 *
 * Usage:
 *   node scripts/test-api.mjs           # raw fetch test
 *   node scripts/test-api.mjs --sdk     # via @ai-sdk/openai
 */
import { readFileSync, existsSync } from "fs";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// ── Load .dev.vars ────────────────────────────────────────────────────────────
function loadDevVars(path = ".dev.vars") {
  if (!existsSync(path)) {
    console.error("ERROR: .dev.vars not found. Copy .dev.vars.example and fill in your credentials.");
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.startsWith("#")) continue;
    vars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadDevVars();
const BASE_URL = env.BASE_URL;
const API_KEY = env.API_KEY;
const MODEL = env.MODEL || "xiaomi/mimo-v2-omni";

if (!API_KEY) {
  console.error("ERROR: API_KEY is missing from .dev.vars");
  process.exit(1);
}

console.log(`BASE_URL : ${BASE_URL}`);
console.log(`MODEL    : ${MODEL}`);
console.log(`API_KEY  : ${API_KEY.slice(0, 12)}...`);
console.log("");

const useSDK = process.argv.includes("--sdk");

if (useSDK) {
  // ── SDK test (mirrors worker code exactly) ─────────────────────────────────
  console.log("Mode: @ai-sdk/openai streaming test\n");
  const provider = createOpenAI({ baseURL: BASE_URL, apiKey: API_KEY, fetch });
  const result = streamText({
    model: provider.chat(MODEL),
    messages: [{ role: "user", content: "你好，来一句骂人的话。" }],
    system: "你是暴躁教授。",
  });
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  console.log("\n\n[SDK stream finished]");
} else {
  // ── Raw fetch test (baseline network/auth check) ───────────────────────────
  console.log("Mode: raw fetch baseline test\n");
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: "ping" }],
      stream: false,
    }),
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data).slice(0, 400));
}
