import { type UIMessage, useChat } from "@ai-sdk/react";
import type { AttachmentAdapter } from "@assistant-ui/react";
import {
	AssistantRuntimeProvider,
	type RemoteThreadListAdapter,
	RuntimeAdapterProvider,
	useAui,
	useAuiState,
	useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import {
	DefaultChatTransport,
	lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createAssistantStream } from "assistant-stream";
import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DEFAULT_PERSONA, PERSONAS, type PersonaId } from "../worker/model";
import { AcademicSearchToolUI } from "./components/tools/AcademicSearchToolUI";
import { AskUserToolUI } from "./components/tools/AskUserToolUI";
import {
	DocSearchToolUI,
	DocSuggestToolUI,
} from "./components/tools/DocSearchToolUI";
import { HighlightDocToolUI } from "./components/tools/HighlightDocToolUI";
import { OpenDocToolUI } from "./components/tools/OpenDocToolUI";
import { ReadDocToolUI } from "./components/tools/ReadDocToolUI";
import { RecipeToolUI } from "./components/tools/RecipeToolUI";
import { SaveMemoryToolUI } from "./components/tools/SaveMemoryToolUI";
import { SearchToolUI } from "./components/tools/SearchToolUI";
import { ElevenLabsScribeAdapter } from "./lib/elevenlabs-scribe-adapter";
import { ElevenLabsTTSAdapter } from "./lib/elevenlabs-tts-adapter";

// ── Persona Context (per-thread persona, set at thread creation) ──────────

const PersonaCtx = createContext<{
	persona: PersonaId;
	setPersona: (id: PersonaId) => void;
}>({ persona: DEFAULT_PERSONA, setPersona: () => {} });

export const usePersona = () => useContext(PersonaCtx);

// ── Auto-TTS Context (persisted per-browser in localStorage) ──────────────

const AutoTTSCtx = createContext<{
	autoTTS: boolean;
	setAutoTTS: (v: boolean) => void;
}>({ autoTTS: true, setAutoTTS: () => {} });

export const useAutoTTS = () => useContext(AutoTTSCtx);

// ── Voice Mode Context ────────────────────────────────────────────────────

export interface VoiceModeState {
	active: boolean;
	docId: string | null;
	docTitle: string | null;
	systemPrompt: string | null;
}

interface VoiceTranscriptItem {
	role: "user" | "assistant";
	text: string;
}

const VoiceModeCtx = createContext<{
	voiceMode: VoiceModeState;
	enterVoiceMode: (docId: string, docTitle: string) => void;
	exitVoiceMode: (voiceMessages?: VoiceTranscriptItem[]) => void;
}>({
	voiceMode: { active: false, docId: null, docTitle: null, systemPrompt: null },
	enterVoiceMode: () => {},
	exitVoiceMode: () => {},
});

export const useVoiceMode = () => useContext(VoiceModeCtx);

// ── ElevenLabs Adapters (stable module-scope instances) ─────────────────────

const scribeAdapter = new ElevenLabsScribeAdapter({
	tokenEndpoint: "/api/scribe-token",
	languageCode: "zh",
	toSimplified: true, // convert Traditional → Simplified Chinese
});

const ttsAdapter = new ElevenLabsTTSAdapter({ endpoint: "/api/tts" });

const stableAdapters = {
	dictation: scribeAdapter,
	speech: ttsAdapter,
};

/** Voice messages pending merge into text chat. Module-level to bridge
 *  between RuntimeProvider (writer) and useMyRuntime (reader). */
let pendingVoiceMsgs: VoiceTranscriptItem[] | null = null;

// ── Attachment Adapter ──────────────────────────────────────────────────────

const readAsDataURL = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(r.result as string);
		r.onerror = reject;
		r.readAsDataURL(file);
	});

const attachmentAdapter: AttachmentAdapter = {
	accept: "image/*,application/pdf,video/*,audio/*",
	async add({ file }) {
		return {
			id: file.name,
			type: file.type.startsWith("image/") ? "image" : "document",
			name: file.name,
			contentType: file.type,
			file,
			status: { type: "requires-action", reason: "composer-send" },
		};
	},
	async send(attachment) {
		const { file } = attachment;
		const url = await readAsDataURL(file);
		if (file.type.startsWith("image/")) {
			return {
				...attachment,
				status: { type: "complete" },
				content: [{ type: "image", image: url }],
			};
		}
		return {
			...attachment,
			status: { type: "complete" },
			content: [{ type: "file", data: url, mimeType: file.type }],
		};
	},
	async remove() {},
};

// ── Thread List Adapter (backed by /api/threads) ────────────────────────────

// ── Thread persona mapping (remoteId → persona) ──────────────────────────

const threadPersonaMap = new Map<string, PersonaId>();

/** Update cached persona for a thread (called when user switches persona). */
export function setThreadPersona(remoteId: string, persona: PersonaId) {
	threadPersonaMap.set(remoteId, persona);
}

const threadListAdapter: RemoteThreadListAdapter = {
	async list() {
		const res = await fetch("/api/threads");
		if (!res.ok) return { threads: [] };
		const threads = (await res.json()) as {
			id: string;
			title: string;
			persona: string;
		}[];
		for (const t of threads) {
			threadPersonaMap.set(t.id, (t.persona ?? "professor") as PersonaId);
		}
		return {
			threads: threads.map((t) => ({
				remoteId: t.id,
				status: "regular" as const,
				title: t.title,
			})),
		};
	},

	async initialize() {
		// Generate a proper UUID as remoteId (server creates via ensureThread)
		const remoteId = crypto.randomUUID();
		return { remoteId, externalId: undefined };
	},

	async rename(remoteId, title) {
		await fetch(`/api/threads/${remoteId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title }),
		});
	},

	async archive(remoteId) {
		await fetch(`/api/threads/${remoteId}`, { method: "DELETE" });
	},

	async unarchive() {},

	async delete(remoteId) {
		await fetch(`/api/threads/${remoteId}`, { method: "DELETE" });
	},

	async fetch(remoteId) {
		return { remoteId, status: "regular" as const };
	},

	async generateTitle(remoteId, messages) {
		return createAssistantStream(async (controller) => {
			const firstUser = messages.find((m) => m.role === "user");
			const text =
				firstUser?.content
					?.filter(
						(c): c is { type: "text"; text: string } => c.type === "text",
					)
					.map((c) => c.text)
					.join(" ") ?? "";

			if (!text) {
				controller.appendText("新对话");
				return;
			}

			// Call server to generate + persist LLM title in one step
			try {
				const res = await fetch(`/api/threads/${remoteId}/generate-title`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text: text.slice(0, 200) }),
				});
				if (res.ok) {
					const { title } = (await res.json()) as { title: string };
					controller.appendText(title || text.slice(0, 30));
				} else {
					controller.appendText(text.slice(0, 30));
				}
			} catch {
				controller.appendText(text.slice(0, 30));
			}
		});
	},

	unstable_Provider: ThreadAdapterProvider,
};

// ── Per-Thread Adapter Provider ─────────────────────────────────────────────

const threadAdapters = { attachments: attachmentAdapter };

function ThreadAdapterProvider({ children }: { children: ReactNode }) {
	return (
		<RuntimeAdapterProvider adapters={threadAdapters}>
			{children}
		</RuntimeAdapterProvider>
	);
}

// ── Runtime Hook (per-thread) ───────────────────────────────────────────────
// Uses useChat + useAISDKRuntime directly (not useChatRuntime) so we can
// call chat.setMessages() after loading history from the server.

function useMyRuntime() {
	const aui = useAui();
	const { persona } = usePersona();

	// Sync TTS voice + params to current persona
	const currentPersona = PERSONAS[persona];
	ttsAdapter.voiceId = currentPersona.voiceId;
	ttsAdapter.voiceSpeed = currentPersona.voiceSpeed;
	ttsAdapter.voiceStability = currentPersona.voiceStability;

	const stateRef = useRef(aui.threadListItem().getState());
	stateRef.current = aui.threadListItem().getState();

	const remoteId = stateRef.current.remoteId;

	// Fetch messages for existing threads
	const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>([]);
	useEffect(() => {
		if (!remoteId) return;
		let cancelled = false;
		fetch(`/api/threads/${remoteId}/messages`)
			.then((r) => (r.ok ? r.json() : []))
			.then((msgs) => {
				if (!cancelled) setLoadedMessages(msgs as UIMessage[]);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [remoteId]);

	// Dynamic header: reads remoteId at send time (after initialize()).
	// IMPORTANT: Read from aui store directly (not stateRef) to avoid a race
	// condition where initialize() has resolved but React hasn't re-rendered
	// yet, causing stateRef.current.remoteId to still be undefined and the
	// local __LOCALID_xxx to be sent as x-thread-id — which creates a
	// duplicate thread on the backend and splits the conversation.
	const personaRef = useRef(persona);
	personaRef.current = persona;

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/chat",
				headers: async () => {
					// Wait for initialize() to resolve remoteId (max ~500ms)
					let state = aui.threadListItem().getState();
					for (let i = 0; i < 50 && !state.remoteId; i++) {
						await new Promise((r) => setTimeout(r, 10));
						state = aui.threadListItem().getState();
					}
					const threadId = state.remoteId ?? state.id;
					return {
						"x-thread-id": threadId,
						"x-persona": personaRef.current,
						"x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
						"x-active-doc": sessionStorage.getItem("center:activeTab") ?? "",
					};
				},
			}),
		[aui],
	);

	// Use stable local ID for useChat's internal state (never changes).
	// remoteId is only used in transport headers for the server.
	const chat = useChat({
		id: stateRef.current.id,
		transport,
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
	});

	// Sync loaded messages into the Chat instance after fetch completes
	useEffect(() => {
		if (loadedMessages.length > 0) {
			chat.setMessages(loadedMessages);
		}
	}, [loadedMessages, chat.setMessages]);

	// Merge voice messages into chat when returning from voice mode
	const { voiceMode } = useVoiceMode();
	useEffect(() => {
		if (voiceMode.active || !pendingVoiceMsgs) return;
		const voiceMsgs = pendingVoiceMsgs;
		pendingVoiceMsgs = null;

		// Insert a separator + voice transcripts into the chat
		const existing = chat.messages;
		const separator = {
			id: crypto.randomUUID(),
			role: "user" as const,
			parts: [{ type: "text" as const, text: "🎙 进入语音陪读" }],
		};
		const converted = voiceMsgs.map((m) => ({
			id: crypto.randomUUID(),
			role: m.role as "user" | "assistant",
			parts: [
				{
					type: "text" as const,
					text: m.role === "assistant" ? `🎙 ${m.text}` : m.text,
				},
			],
		}));
		chat.setMessages([...existing, separator, ...converted]);

		// Persist to DB
		const threadId = aui.threadListItem().getState().remoteId;
		if (threadId) {
			fetch(`/api/threads/${threadId}/voice-messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: [separator, ...converted] }),
			}).catch(() => {});
		}

		// Scroll to bottom after merge
		setTimeout(() => {
			document
				.querySelector(
					"[data-role='assistant']:last-child, [data-role='user']:last-child",
				)
				?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, [voiceMode.active, chat.messages, chat.setMessages, aui]);

	return useAISDKRuntime(chat, {
		adapters: stableAdapters,
	});
}

// ── Root Provider ───────────────────────────────────────────────────────────

const AUTO_TTS_KEY = "settings:autoTTS";

export const RuntimeProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [persona, setPersonaRaw] = useState<PersonaId>(() => {
		try {
			const saved = localStorage.getItem("settings:persona");
			if (saved && saved in PERSONAS) return saved as PersonaId;
		} catch {}
		return DEFAULT_PERSONA;
	});
	const setPersona = useCallback((id: PersonaId) => {
		setPersonaRaw(id);
		try {
			localStorage.setItem("settings:persona", id);
		} catch {}
	}, []);
	const personaCtx = useMemo(
		() => ({ persona, setPersona }),
		[persona, setPersona],
	);

	const [autoTTS, setAutoTTSRaw] = useState(() => {
		try {
			return localStorage.getItem(AUTO_TTS_KEY) !== "false";
		} catch {
			return true;
		}
	});
	const setAutoTTS = useCallback((v: boolean) => {
		setAutoTTSRaw(v);
		try {
			localStorage.setItem(AUTO_TTS_KEY, String(v));
		} catch {}
	}, []);
	const autoTTSCtx = useMemo(
		() => ({ autoTTS, setAutoTTS }),
		[autoTTS, setAutoTTS],
	);

	const runtime = useRemoteThreadListRuntime({
		runtimeHook: useMyRuntime,
		adapter: threadListAdapter,
	});

	// ── Voice mode ────────────────────────────────────────────────────────
	const [voiceMode, setVoiceMode] = useState<VoiceModeState>({
		active: false,
		docId: null,
		docTitle: null,
		systemPrompt: null,
	});

	const enterVoiceMode = useCallback(
		async (docId: string, docTitle: string) => {
			// Stop any ongoing TTS before entering voice mode
			try {
				const speech = runtime.thread.getState().speech;
				if (speech) runtime.thread.stopSpeaking();
			} catch {}

			// Fetch document content for system prompt injection
			let docContent = "";
			try {
				const res = await fetch(`/api/documents/${docId}/markdown`);
				if (res.ok) docContent = await res.text();
			} catch {}

			// Summarize recent text conversation for voice context continuity
			let chatSummary = "";
			try {
				const msgs = runtime.thread.getState().messages;
				const recent = msgs.slice(-10);
				if (recent.length > 0) {
					chatSummary = recent
						.map((m) => {
							const text = m.content
								.filter(
									(p): p is { type: "text"; text: string } => p.type === "text",
								)
								.map((p) => p.text)
								.join(" ");
							return `${m.role === "user" ? "学生" : "导师"}：${text.slice(0, 200)}`;
						})
						.join("\n");
				}
			} catch {}

			const p = PERSONAS[persona];
			const truncated = docContent.slice(0, 12000);

			const prompt = `${p.prompt}

# 语音对话规则
- 你正在与学生进行实时语音对话，讨论一篇文档
- 回答简洁口语化，每次回复控制在3-5句话以内
- 禁止输出 markdown、代码块、列表符号等书面格式
- 可以主动追问学生的理解，引导深入讨论

# 正在阅读的文档：「${docTitle}」

${truncated}${chatSummary ? `\n\n# 之前的文字对话记录（供参考）\n${chatSummary}` : ""}`;

			setVoiceMode({ active: true, docId, docTitle, systemPrompt: prompt });
		},
		[persona, runtime],
	);

	const exitVoiceMode = useCallback((voiceMessages?: VoiceTranscriptItem[]) => {
		if (voiceMessages && voiceMessages.length > 0) {
			pendingVoiceMsgs = voiceMessages;
		}
		setVoiceMode({
			active: false,
			docId: null,
			docTitle: null,
			systemPrompt: null,
		});
	}, []);

	const voiceModeCtx = useMemo(
		() => ({ voiceMode, enterVoiceMode, exitVoiceMode }),
		[voiceMode, enterVoiceMode, exitVoiceMode],
	);

	return (
		<PersonaCtx value={personaCtx}>
			<AutoTTSCtx value={autoTTSCtx}>
				<VoiceModeCtx value={voiceModeCtx}>
					<AssistantRuntimeProvider runtime={runtime}>
						<PersonaSync />
						<AutoSpeakWatcher />
						{/* Each tool UI matches a backend tool by toolName */}
						<AskUserToolUI />
						<SearchToolUI />
						<AcademicSearchToolUI />
						<DocSuggestToolUI />
						<DocSearchToolUI />
						<OpenDocToolUI />
						<HighlightDocToolUI />
						<ReadDocToolUI />
						<RecipeToolUI />
						<SaveMemoryToolUI />
						{children}
					</AssistantRuntimeProvider>
				</VoiceModeCtx>
			</AutoTTSCtx>
		</PersonaCtx>
	);
};

/** Syncs persona state when the active thread changes. */
function PersonaSync() {
	const { setPersona } = usePersona();
	const remoteId = useAuiState((s) => s.threadListItem.remoteId);

	useEffect(() => {
		const mapped = remoteId ? threadPersonaMap.get(remoteId) : undefined;
		if (mapped) setPersona(mapped);
	}, [remoteId, setPersona]);

	return null;
}

/** Auto-speaks last assistant message when generation finishes.
 *  Uses aui.thread().speak(messageId) so the message UI shows speech state. */
function AutoSpeakWatcher() {
	const { autoTTS } = useAutoTTS();
	const { voiceMode } = useVoiceMode();
	const aui = useAui();
	const isRunning = useAuiState((s) => s.thread.isRunning);
	const wasRunning = useRef(false);

	useEffect(() => {
		if (wasRunning.current && !isRunning && autoTTS && !voiceMode.active) {
			// Generation finished — auto-speak last assistant message
			const msgs = aui.thread().getState().messages;
			const last = [...msgs].reverse().find((m) => m.role === "assistant");
			if (last) aui.thread().message({ id: last.id }).speak();
		}
		if (!wasRunning.current && isRunning) {
			// New generation started (user sent message) — stop current speech
			const speech = aui.thread().getState().speech;
			if (speech) aui.thread().stopSpeaking();
		}
		wasRunning.current = isRunning;
	}, [isRunning, autoTTS, voiceMode.active, aui]);

	return null;
}
