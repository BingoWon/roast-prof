#!/usr/bin/env node
/**
 * scripts/test-pdf.mjs
 * Test PDF multimodal via OpenRouter raw format (as documented).
 * Usage: node scripts/test-pdf.mjs
 */
import { readFileSync, existsSync } from "fs";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf-8").split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const { BASE_URL, API_KEY, MODEL, SITE_URL, SITE_NAME, SITE_CATEGORIES } = vars;
const originHeaders = {
  "HTTP-Referer": SITE_URL,
  "X-OpenRouter-Title": SITE_NAME,
  "X-OpenRouter-Categories": SITE_CATEGORIES,
};

// Fetch a small public PDF to test
const pdfRes = await fetch("https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdfs/table.pdf");
const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
const pdfB64DataUrl = `data:application/pdf;base64,${pdfBuf.toString("base64")}`;

// OpenRouter raw format for PDF (from docs)
const openRouterMessages = [
  { role: "system", content: "你是暴躁教授。" },
  {
    role: "user",
    content: [
      { type: "text", text: "这个文件里有什么？用一句话概括。" },
      { type: "file", file: { filename: "test.pdf", file_data: pdfB64DataUrl } },
    ],
  },
];

console.log("Testing PDF with OpenRouter raw format via fetch interceptor...\n");

// The interceptor replaces SDK messages with OpenRouter-formatted ones
const provider = createOpenAI({
  baseURL: BASE_URL,
  apiKey: API_KEY,
  headers: originHeaders,
  fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    body.messages = openRouterMessages; // inject real messages
    return globalThis.fetch(url, { ...options, body: JSON.stringify(body) });
  },
});

const result = streamText({
  model: provider.chat(MODEL),
  messages: [{ role: "user", content: "placeholder" }], // passes SDK validation
});

for await (const chunk of result.textStream) process.stdout.write(chunk);
console.log("\n\n[PDF test done]");
