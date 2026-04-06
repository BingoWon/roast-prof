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

export class ElevenLabsVoiceAdapter implements RealtimeVoiceAdapter {
	private opts: VoiceAdapterOptions;

	constructor(opts: VoiceAdapterOptions) {
		this.opts = opts;
	}

	/** Update overrides dynamically before connect(). */
	configure(overrides: VoiceSessionOverrides) {
		this.opts.overrides = overrides;
	}

	connect(connectOpts: { abortSignal?: AbortSignal }) {
		const { signedUrlEndpoint, overrides } = this.opts;

		return createVoiceSession(connectOpts, async (ctx) => {
			const res = await fetch(signedUrlEndpoint);
			if (!res.ok) throw new Error("语音对话连接失败");
			const { signedUrl } = (await res.json()) as { signedUrl: string };

			let volumeInterval: ReturnType<typeof setInterval> | null = null;

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
						...(overrides?.voiceId && { voiceId: overrides.voiceId }),
						...(overrides?.voiceSpeed != null && {
							speed: overrides.voiceSpeed,
						}),
						...(overrides?.voiceStability != null && {
							stability: overrides.voiceStability,
						}),
					},
				},

				onConnect: () => {
					ctx.setStatus({ type: "running" });
					volumeInterval = setInterval(() => {
						ctx.emitVolume(conversation.getInputVolume());
					}, 50);
				},

				onDisconnect: () => {
					if (volumeInterval) clearInterval(volumeInterval);
					ctx.end("finished");
				},

				onError: (error) => {
					console.error("[Voice] Error:", error);
					if (volumeInterval) clearInterval(volumeInterval);
					ctx.end("error", error);
				},

				onModeChange: ({ mode }) => {
					ctx.emitMode(mode === "speaking" ? "speaking" : "listening");
				},

				onMessage: ({ source, message }) => {
					ctx.emitTranscript({
						role: source === "ai" ? "assistant" : "user",
						text: message,
						isFinal: true,
					});
				},
			});

			return {
				disconnect: () => conversation.endSession(),
				mute: () => conversation.setVolume({ volume: 0 }),
				unmute: () => conversation.setVolume({ volume: 1 }),
			};
		});
	}
}
