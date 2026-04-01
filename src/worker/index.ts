import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";

// Use the globally generated Env from worker-configuration.d.ts (via `pnpm cf-typegen`)
const app = new Hono<{ Bindings: Env }>();

// ── Types for Assistant-UI message wire format ────────────────────────────────

type MessagePart =
	| { type: "text"; text: string }
	| { type: "image"; image?: string; url?: string }
	| { type: "image_url"; image_url?: { url: string }; url?: string }
	| { type: "file"; mediaType?: string; url?: string };

type UIMessage = {
	role: string;
	parts?: MessagePart[];
	content?: string;
};

/** Convert Assistant-UI UIMessage parts to Vercel AI SDK CoreMessage content. */
function toCoreParts(parts: MessagePart[]) {
	return parts
		.map((p) => {
			if (p.type === "text") return { type: "text" as const, text: p.text };
			if (p.type === "image")
				return { type: "image" as const, image: p.image ?? p.url ?? "" };
			if (p.type === "image_url")
				return {
					type: "image" as const,
					image: p.image_url?.url ?? p.url ?? "",
				};
			if (p.type === "file")
				return {
					type: "file" as const,
					mimeType: p.mediaType ?? "application/octet-stream",
					data: p.url ?? "",
				};
			return null;
		})
		.filter(Boolean);
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ status: "ok", name: "roast-prof" }));

app.post("/api/chat", async (c) => {
	try {
		const { messages } = await c.req.json<{ messages: UIMessage[] }>();

		if (!c.env.API_KEY) {
			return c.json({ error: "Missing API_KEY secret" }, 500);
		}

		const provider = createOpenAI({
			baseURL: c.env.BASE_URL ?? "https://api.openai.com/v1",
			apiKey: c.env.API_KEY,
			fetch,
		});

		const coreMessages = messages.map((m) => ({
			role: m.role,
			content: m.parts?.length
				? toCoreParts(m.parts as MessagePart[])
				: (m.content ?? ""),
		}));

		const model = c.env.MODEL ?? "xiaomi/mimo-v2-omni";
		console.log(`[Worker] ${messages.length} msgs → ${model}`);

		const result = streamText({
			model: provider.chat(model),
			// biome-ignore lint/suspicious/noExplicitAny: CoreMessage union can't express mixed role+content at compile time
			messages: coreMessages as any,
			system:
				"你现在是林亦频道的「暴躁教授」。用极其刻薄、但也足够专业的学术口吻回答问题。偶尔嘲讽用户的无知，偶尔冷幽默。保持中文，短句为主。",
		});

		return result.toUIMessageStreamResponse();
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		console.error("[Worker] /api/chat error:", msg);
		return c.json({ error: msg }, 500);
	}
});

export default app;
