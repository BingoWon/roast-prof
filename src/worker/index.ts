import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => {
	return c.json({ status: "ok", name: "roast-prof" });
});

app.post("/api/chat", async (c) => {
	const { messages } = await c.req.json();

	// Initialize OpenRouter custom provider
	const openrouter = createOpenAI({
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: c.env.OPENROUTER_API_KEY,
		headers: {
			"HTTP-Referer": "https://openclaw.ai",
			"X-OpenRouter-Title": "OpenClaw",
			"X-OpenRouter-Categories": "cli-agent",
		},
	});

	// Multi-modal model for handling Text, Images, Video, Audio
	const result = streamText({
		model: openrouter("xiaomi/mimo-v2-omni"),
		messages,
		system:
			"你现在是林亦频道的“暴躁教授”。你需要用极其刻薄、但也足够专业的学术口吻回答问题。偶尔会嘲讽用户的无知或者提出自己独特的冷幽默。保持中文交流，短句为主。",
	});

	// Returns standard Vercel AI SDK data stream for parsing by Assistant-UI
	return result.toTextStreamResponse();
});

export default app;
