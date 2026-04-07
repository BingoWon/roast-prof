import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	stepCountIs,
	streamText,
} from "ai";
import { Hono } from "hono";
import { createDb, ensureThread, saveMessages, touchThread } from "../db";
import { log } from "../log";
import {
	addMemories,
	formatMemoriesForPrompt,
	searchMemories,
} from "../memory";
import {
	createModel,
	DEFAULT_PERSONA,
	getSystemPrompt,
	resolvePersona,
} from "../model";
import { listUserDocuments } from "../rag";
import {
	createDocTools,
	createExaTools,
	createMemoryTool,
	hitlTools,
} from "../tools";
import { maybeAutoTitle, requireUserId, type WireMessage } from "./helpers";

const chat = new Hono<{ Bindings: Env }>();

function resolveDataUrls(messages: WireMessage[]): WireMessage[] {
	return messages.map((msg) => {
		if (!Array.isArray(msg.parts)) return msg;
		const parts = msg.parts.map(
			// biome-ignore lint/suspicious/noExplicitAny: flexible wire part
			(part: any) => {
				if (typeof part.url !== "string") return part;
				const match = part.url.match(/^data:([^;]+);base64,(.+)$/s);
				if (!match) return part;
				return { ...part, url: match[2], mediaType: match[1] };
			},
		);
		return { ...msg, parts };
	});
}

function stripUnresolvedToolCalls(messages: WireMessage[]): WireMessage[] {
	return messages.map((msg) => {
		if (msg.role !== "assistant" || !Array.isArray(msg.parts)) return msg;
		const filtered = msg.parts.filter(
			// biome-ignore lint/suspicious/noExplicitAny: wire format
			(part: any) => {
				if (!part.type?.startsWith("tool-")) return true;
				if (part.output != null || part.result != null) return true;
				if (part.state !== "input-available") return true;
				return false;
			},
		);
		if (filtered.length === msg.parts.length) return msg;
		return { ...msg, parts: filtered };
	});
}

chat.post("/", async (c) => {
	try {
		const { messages } = await c.req.json<{ messages: WireMessage[] }>();
		const threadId = c.req.header("x-thread-id") || undefined;
		const personaRaw = c.req.header("x-persona") || DEFAULT_PERSONA;
		const persona = resolvePersona(personaRaw);
		const userId = await requireUserId(c);

		if (!c.env.LLM_API_KEY)
			return c.json({ error: "缺少 LLM_API_KEY 配置" }, 500);
		if (!c.env.LLM_MODEL) return c.json({ error: "缺少 LLM_MODEL 配置" }, 500);

		const db = createDb(c.env.DB);

		// Trim text parts in all messages
		for (const msg of messages) {
			if (Array.isArray(msg.parts)) {
				for (const p of msg.parts) {
					if (p.type === "text" && typeof p.text === "string") {
						p.text = p.text.trim();
					}
				}
			}
		}

		const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

		// ── Persist user message ──────────────────────────────────────────────
		if (threadId && userId && lastUserMsg) {
			try {
				await ensureThread(db, threadId, userId, { persona });
				const parts = lastUserMsg.parts?.length
					? lastUserMsg.parts
					: [{ type: "text" as const, text: lastUserMsg.content ?? "" }];
				await saveMessages(db, [
					{
						id: lastUserMsg.id ?? crypto.randomUUID(),
						threadId,
						role: "user",
						parts: parts as unknown[],
						createdAt: Math.floor(Date.now() / 1000),
					},
				]);
				await touchThread(db, threadId, userId);
			} catch (e) {
				log.error({
					module: "chat",
					msg: "persist user msg failed",
					error: String(e),
				});
			}
		}

		// ── Upsert assistant messages with tool results (HITL persistence) ───
		if (threadId && userId) {
			try {
				const assistantWithResults = messages.filter(
					(m: WireMessage) =>
						m.role === "assistant" &&
						Array.isArray(m.parts) &&
						m.parts.some(
							// biome-ignore lint/suspicious/noExplicitAny: wire format
							(p: any) =>
								p.type?.startsWith("tool-") &&
								(p.result != null || p.output != null),
						),
				);
				if (assistantWithResults.length > 0) {
					const now = Math.floor(Date.now() / 1000);
					await saveMessages(
						db,
						assistantWithResults.map((m: WireMessage) => ({
							id: m.id,
							threadId,
							role: "assistant",
							parts: m.parts as unknown[],
							createdAt: now,
						})),
					);
				}
			} catch (e) {
				log.error({
					module: "chat",
					msg: "upsert tool results failed",
					error: String(e),
				});
			}
		}

		// ── Auto-generate title on first message ────────────────────────────
		const userMessages = messages.filter((m: WireMessage) => m.role === "user");
		if (threadId && userId && userMessages.length === 1) {
			maybeAutoTitle(
				c.executionCtx,
				c.env,
				db,
				threadId,
				userId,
				userMessages as {
					role: string;
					parts?: { type: string; text?: string }[];
				}[],
			);
		}

		// ── Retrieve relevant memories ───────────────────────────────────────
		let retrievedMemories: Awaited<ReturnType<typeof searchMemories>> = [];
		if (userId && c.env.MEM0_API_KEY) {
			const lastText = lastUserMsg?.parts
				?.filter((p: { type: string }) => p.type === "text")
				.map((p: { text?: string }) => p.text ?? "")
				.join(" ");
			if (lastText) {
				retrievedMemories = await searchMemories(c.env, lastText, userId);
			}
		}

		// ── Fetch user's document list ──────────────────────────────────────
		let docList: Awaited<ReturnType<typeof listUserDocuments>> = [];
		if (userId) {
			try {
				docList = await listUserDocuments(db, userId);
			} catch {}
		}

		// ── Build system prompt ──────────────────────────────────────────────
		const tz = c.req.header("x-timezone") || "Asia/Shanghai";
		const timeStr = new Date().toLocaleString("zh-CN", { timeZone: tz });
		const autoTTS = c.req.header("x-auto-tts") === "1";
		let systemPrompt =
			`${getSystemPrompt(persona)}\n\n当前时间：${timeStr}` +
			formatMemoriesForPrompt(retrievedMemories);
		if (autoTTS) {
			systemPrompt +=
				"\n\n⚠️ 用户已开启自动朗读模式。你的最终输出应尽可能使用纯文本，避免 markdown 格式（如加粗、列表、代码块等），因为这些格式朗读效果不佳。用自然的口语化表达，适当分段即可。";
		}
		if (docList.length > 0) {
			const readyDocs = docList.filter((d) => d.status === "ready");
			if (readyDocs.length > 0) {
				const activeDocId = c.req.header("x-active-doc") || undefined;
				const docListStr = readyDocs
					.map((d) => {
						const active =
							d.id === activeDocId ? " ← 用户当前激活已打开的就是这个文档" : "";
						return `- ID: ${d.id}  标题:「${d.title}」 分块数：${d.chunks}${active}`;
					})
					.join("\n");
				systemPrompt += `\n\n用户文档库（共 ${readyDocs.length} 份）：\n${docListStr}`;
			}
		}

		// ── Build tools ─────────────────────────────────────────────────────
		// biome-ignore lint/suspicious/noExplicitAny: tool generics incompatible with Record
		let memoryTools: Record<string, any> = {};
		if (userId && c.env.MEM0_API_KEY) {
			memoryTools = createMemoryTool({ env: c.env, userId });
		}
		// biome-ignore lint/suspicious/noExplicitAny: tool generics incompatible with Record
		let exaTools: Record<string, any> = {};
		if (c.env.EXA_API_KEY) {
			exaTools = createExaTools({ env: c.env });
		}
		// biome-ignore lint/suspicious/noExplicitAny: tool generics incompatible with Record
		let docTools: Record<string, any> = {};
		if (userId) {
			try {
				docTools = createDocTools({
					docIds: docList.map((d) => d.id),
					docList,
					db,
					vectorize: c.env.VECTORIZE,
					env: c.env,
				});
			} catch {}
		}

		// ── Extract memories concurrently (fire-and-forget) ──────────────────
		if (userId && c.env.MEM0_API_KEY) {
			const memMsgs = messages
				.filter((m: WireMessage) => m.role === "user" || m.role === "assistant")
				.slice(-6)
				.map((m: WireMessage) => ({
					role: m.role as string,
					content:
						m.parts
							?.filter((p: { type: string }) => p.type === "text")
							.map((p: { text?: string }) => p.text ?? "")
							.join(" ")
							.trim() ?? "",
				}))
				.filter((m) => m.content.length > 0);
			if (memMsgs.length > 0) {
				c.executionCtx.waitUntil(
					addMemories(c.env, memMsgs, userId).catch((e) => {
						log.error({
							module: "chat",
							msg: "memory extraction failed",
							error: String(e),
						});
					}),
				);
			}
		}

		// ── Stream chat response ─────────────────────────────────────────────
		const wrappedModel = createModel(c.env);

		let resolveFinish!: () => void;
		const finishPromise = new Promise<void>((r) => {
			resolveFinish = r;
		});

		const uiStream = createUIMessageStream({
			execute: async ({ writer }) => {
				const modelMessages = await convertToModelMessages(
					// biome-ignore lint/suspicious/noExplicitAny: wire format → UIMessage
					stripUnresolvedToolCalls(resolveDataUrls(messages)) as any,
				);

				const lastModelMsg = modelMessages[modelMessages.length - 1];
				const isHitlContinuation =
					lastModelMsg?.role === "tool" ||
					(lastModelMsg?.role === "assistant" &&
						Array.isArray(lastModelMsg.content) &&
						lastModelMsg.content.some(
							(p: { type: string }) => p.type === "tool-result",
						));

				const chatResult = streamText({
					model: wrappedModel,
					system: systemPrompt,
					messages: modelMessages,
					tools: {
						...hitlTools,
						...exaTools,
						...memoryTools,
						...docTools,
					},
					stopWhen: stepCountIs(5),
					...(isHitlContinuation && {
						providerOptions: {
							openrouter: { reasoning: { effort: "none" } },
						},
					}),
				});

				writer.merge(
					chatResult.toUIMessageStream({
						sendReasoning: true,
						messageMetadata: ({ part }) =>
							part.type === "start" && retrievedMemories.length > 0
								? { mem0: retrievedMemories }
								: undefined,
					}),
				);
			},
			onFinish: async ({ messages: finishedMessages }) => {
				try {
					if (threadId && userId && finishedMessages.length > 0) {
						const inputIds = new Set(
							messages.map((m: WireMessage) => m.id).filter(Boolean),
						);
						const newMsgs = finishedMessages.filter(
							(m) => m.role !== "user" && !inputIds.has(m.id),
						);
						if (newMsgs.length > 0) {
							const now = Math.floor(Date.now() / 1000);
							await saveMessages(
								db,
								newMsgs.map((m) => ({
									id: m.id,
									threadId,
									role: m.role,
									parts: m.parts as unknown[],
									createdAt: now,
								})),
							);
							await touchThread(db, threadId, userId);
						}
					}
				} catch (e) {
					log.error({
						module: "chat",
						msg: "persist assistant msgs failed",
						error: String(e),
					});
				} finally {
					resolveFinish();
				}
			},
			generateId: () => crypto.randomUUID(),
		});

		c.executionCtx.waitUntil(finishPromise);
		return createUIMessageStreamResponse({ stream: uiStream });
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "未知错误";
		log.error({ module: "chat", msg });
		return c.json({ error: msg }, 500);
	}
});

export default chat;
