import { VoiceConversation } from "@elevenlabs/client";

export interface VoiceSessionOverrides {
	systemPrompt?: string;
	firstMessage?: string;
	voiceId?: string;
	voiceSpeed?: number;
	voiceStability?: number;
}

export interface VoiceTranscript {
	role: "user" | "assistant";
	text: string;
}

export type VoiceStatus = "idle" | "connecting" | "running" | "ended" | "error";

export interface VoiceSessionCallbacks {
	onStatusChange: (status: VoiceStatus) => void;
	onTranscript: (item: VoiceTranscript) => void;
	onModeChange: (mode: "listening" | "speaking") => void;
	onVolumeChange: (volume: number) => void;
}

/** Strip ElevenLabs mood/action tags: [sigh], [laughs], [背景音乐] etc. */
function stripMoodTags(text: string): string {
	return text.replace(/\[[^\]]*\]/g, "").trim();
}

export async function startVoiceSession(
	signedUrlEndpoint: string,
	overrides: VoiceSessionOverrides,
	callbacks: VoiceSessionCallbacks,
): Promise<{ disconnect: () => void; mute: () => void; unmute: () => void }> {
	let volumeInterval: ReturnType<typeof setInterval> | null = null;
	const lastEmitted = { user: "", assistant: "" };

	const cleanup = () => {
		if (volumeInterval) {
			clearInterval(volumeInterval);
			volumeInterval = null;
		}
	};

	try {
		callbacks.onStatusChange("connecting");
		const res = await fetch(signedUrlEndpoint);
		if (!res.ok) {
			callbacks.onStatusChange("error");
			return { disconnect() {}, mute() {}, unmute() {} };
		}
		const { signedUrl } = (await res.json()) as { signedUrl: string };

		const conversation = await VoiceConversation.startSession({
			signedUrl,
			connectionType: "websocket",
			overrides: {
				agent: {
					...(overrides.systemPrompt && {
						prompt: { prompt: overrides.systemPrompt },
					}),
					...(overrides.firstMessage && {
						firstMessage: overrides.firstMessage,
					}),
					language: "zh",
				},
				tts: {
					...(overrides.voiceId && { voiceId: overrides.voiceId }),
					...(overrides.voiceSpeed != null && {
						speed: overrides.voiceSpeed,
					}),
					...(overrides.voiceStability != null && {
						stability: overrides.voiceStability,
					}),
				},
			},

			onConnect: () => {
				callbacks.onStatusChange("running");
				volumeInterval = setInterval(() => {
					callbacks.onVolumeChange(conversation.getInputVolume());
				}, 50);
			},

			onDisconnect: () => {
				cleanup();
				callbacks.onStatusChange("ended");
			},

			onError: (error) => {
				console.error("[Voice]", error);
				cleanup();
				callbacks.onStatusChange("error");
			},

			onModeChange: ({ mode }) => {
				callbacks.onModeChange(mode === "speaking" ? "speaking" : "listening");
			},

			onMessage: ({ source, message }) => {
				const role = source === "ai" ? "assistant" : "user";
				const clean = stripMoodTags(message);
				if (!clean) return;

				const prev = lastEmitted[role];
				if (prev === clean) return;
				if (prev?.startsWith(clean)) return;
				lastEmitted[role] = clean;

				callbacks.onTranscript({ role, text: clean });
			},
		});

		return {
			disconnect: () => conversation.endSession(),
			mute: () => conversation.setVolume({ volume: 0 }),
			unmute: () => conversation.setVolume({ volume: 1 }),
		};
	} catch (error) {
		console.error("[Voice]", error);
		cleanup();
		callbacks.onStatusChange("error");
		return { disconnect() {}, mute() {}, unmute() {} };
	}
}
