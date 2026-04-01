import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";

type Env = {
	BASE_URL: string;
	API_KEY: string;
	MODEL: string;
};

type Bindings = Env;
const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => {
	return c.json({ status: "ok", name: "roast-prof" });
});

app.post("/api/chat", async (c) => {
	console.log(
		"[Worker] ----------- POST /api/chat Request Intercepted -----------",
	);
	try {
		const requestData = await c.req.json();
		const messages = requestData.messages;
		console.log(`[Worker] Received ${messages.length} messages.`);

		if (!c.env.API_KEY) {
			console.error("[Worker] ERROR: Missing API_KEY env secret.");
			return c.json({ error: "Missing API Key" }, 500);
		}

		// Configure fully agnostic model provider via env variables
		const customProvider = createOpenAI({
			baseURL: c.env.BASE_URL || "https://api.openai.com/v1",
			apiKey: c.env.API_KEY,
			fetch: fetch,
		});

		// Convert Assistant-UI message parts to Vercel AI SDK CoreMessages
		const coreMessages = messages.map((m: any) => {
			if (m.parts) {
				return {
					role: m.role,
					content: m.parts
						.map((p: any) => {
							if (p.type === "text") return { type: "text", text: p.text };
							if (p.type === "image")
								return { type: "image", image: p.image || p.url };
							if (p.type === "image_url")
								return { type: "image", image: p.image_url?.url || p.url };
							if (p.type === "file")
								return {
									type: "file",
									mimeType: p.mediaType || "application/octet-stream",
									data: p.url,
								};
							return null;
						})
						.filter(Boolean),
				};
			}
			return { role: m.role, content: m.content || "" };
		});

		const targetModel = c.env.MODEL || "xiaomi/mimo-v2-omni";
		console.log(`[Worker] Prompting LLM (${targetModel})...`);
		// Multi-modal model for handling Text, Images, Video, Audio
		const result = streamText({
			model: customProvider(targetModel),
			messages: coreMessages,
			system:
				"你现在是林亦频道的“暴躁教授”。你需要用极其刻薄、但也足够专业的学术口吻回答问题。偶尔会嘲讽用户的无知或者提出自己独特的冷幽默。保持中文交流，短句为主。",
		});

		console.log("[Worker] Streaming started from LLM provider.");
		// Returns standard Vercel AI SDK data stream for parsing by Assistant-UI
		return result.toTextStreamResponse();
	} catch (error: unknown) {
		console.error("[Worker] UNHANDLED ERROR in /api/chat:", error);
		if (error instanceof Error && error.stack) {
			console.error(error.stack);
		}
		return c.json(
			{
				error: error instanceof Error ? error.message : "Unknown Worker Error",
			},
			500,
		);
	}
});

export default app;
