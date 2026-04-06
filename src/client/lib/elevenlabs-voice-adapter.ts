import type { RealtimeVoiceAdapter } from "@assistant-ui/react";
import { createVoiceSession } from "@assistant-ui/react";
import { VoiceConversation } from "@elevenlabs/client";

export interface VoiceSessionOverrides {
	systemPrompt?: string;
	firstMessage?: string;
	voiceId?: string;
	voiceSpeed?: number;
	voiceStability?: number;
}

export interface VoiceAdapterOptions {
	signedUrlEndpoint: string;
	overrides?: VoiceSessionOverrides;
}

/** Strip ElevenLabs mood/action tags: [sigh], [laughs], [背景音乐] etc. */
function stripMoodTags(text: string): string {
	return text.replace(/\[[^\]]*\]/g, "").trim();
}

export class ElevenLabsVoiceAdapter implements RealtimeVoiceAdapter {
	private opts: VoiceAdapterOptions;

	constructor(opts: VoiceAdapterOptions) {
		this.opts = opts;
	}

	configure(overrides: VoiceSessionOverrides) {
		this.opts.overrides = overrides;
	}

	connect(connectOpts: { abortSignal?: AbortSignal }) {
		const { signedUrlEndpoint, overrides } = this.opts;

		return createVoiceSession(connectOpts, async (ctx) => {
			let volumeInterval: ReturnType<typeof setInterval> | null = null;
			// Dedup: track last emitted text per role to avoid repeats
			const lastEmitted = { user: "", assistant: "" };

			const cleanup = () => {
				if (volumeInterval) {
					clearInterval(volumeInterval);
					volumeInterval = null;
				}
			};

			try {
				console.log("[Voice] Fetching signed URL...");
				const res = await fetch(signedUrlEndpoint);
				if (!res.ok) {
					const body = await res.text().catch(() => "");
					console.error("[Voice] Signed URL failed:", res.status, body);
					throw new Error(`语音对话连接失败: ${res.status}`);
				}
				const { signedUrl } = (await res.json()) as {
					signedUrl: string;
				};
				console.log("[Voice] Connecting WebSocket...");

				const conversation = await VoiceConversation.startSession({
					signedUrl,
					connectionType: "websocket",
					overrides: {
						agent: {
							...(overrides?.systemPrompt && {
								prompt: { prompt: overrides.systemPrompt },
							}),
							...(overrides?.firstMessage && {
								firstMessage: overrides.firstMessage,
							}),
							language: "zh",
						},
						tts: {
							...(overrides?.voiceId && {
								voiceId: overrides.voiceId,
							}),
							...(overrides?.voiceSpeed != null && {
								speed: overrides.voiceSpeed,
							}),
							...(overrides?.voiceStability != null && {
								stability: overrides.voiceStability,
							}),
						},
					},

					onConnect: () => {
						console.log("[Voice] Connected!");
						ctx.setStatus({ type: "running" });
						volumeInterval = setInterval(() => {
							ctx.emitVolume(conversation.getInputVolume());
						}, 50);
					},

					onDisconnect: (details) => {
						console.log("[Voice] Disconnected:", details);
						cleanup();
						ctx.end("finished");
					},

					onError: (error) => {
						console.error("[Voice] Session error:", error);
						cleanup();
						ctx.end("error", error);
					},

					onModeChange: ({ mode }) => {
						console.log("[Voice] Mode:", mode);
						ctx.emitMode(mode === "speaking" ? "speaking" : "listening");
					},

					onMessage: ({ source, message }) => {
						const role = source === "ai" ? "assistant" : "user";
						const clean = stripMoodTags(message);
						if (!clean) return;

						// Dedup: skip if same as last emitted for this role
						if (lastEmitted[role] === clean) return;
						lastEmitted[role] = clean;

						ctx.emitTranscript({
							role,
							text: clean,
							isFinal: true,
						});
					},
				});

				return {
					disconnect: () => {
						console.log("[Voice] User disconnect requested");
						conversation.endSession();
					},
					mute: () => conversation.setVolume({ volume: 0 }),
					unmute: () => conversation.setVolume({ volume: 1 }),
				};
			} catch (error) {
				console.error("[Voice] Connection failed:", error);
				cleanup();
				ctx.end("error", error);
				return {
					disconnect: () => {},
					mute: () => {},
					unmute: () => {},
				};
			}
		});
	}
}
