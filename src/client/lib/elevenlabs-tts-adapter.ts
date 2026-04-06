import type { SpeechSynthesisAdapter } from "@assistant-ui/react";
import {
	CHUNK_GAP_MS,
	fetchTTSBlob,
	playBlob,
	splitIntoChunks,
	stripMarkdown,
	type TTSVoiceParams,
} from "./tts-utils";

/**
 * ElevenLabs TTS adapter with chunked parallel fetching for manual speak
 * and proxy mode for auto-TTS integration.
 *
 * Manual speak: splits text into sentence-boundary chunks, fires ALL fetches
 * in parallel, then plays blobs sequentially with a brief inter-chunk gap.
 *
 * Proxy mode: AutoSpeakWatcher calls enterProxyMode() so the next speak()
 * returns a controlled utterance whose cancel() aborts the streaming TTS.
 */
export class ElevenLabsTTSAdapter implements SpeechSynthesisAdapter {
	private endpoint: string;
	voiceId: string | undefined;
	voiceSpeed: number | undefined;
	voiceStability: number | undefined;

	// Proxy mode state
	private proxyCancel: (() => void) | null = null;
	private proxyUtterance: SpeechSynthesisAdapter.Utterance | null = null;
	private proxyNotify: (() => void) | null = null;

	constructor(options?: { endpoint?: string }) {
		this.endpoint = options?.endpoint ?? "/api/tts";
	}

	/** Get current voice params for shared fetch utility. */
	get voiceParams(): TTSVoiceParams {
		return {
			endpoint: this.endpoint,
			voiceId: this.voiceId,
			speed: this.voiceSpeed,
			stability: this.voiceStability,
		};
	}

	/** Enter proxy mode: the next speak() returns a stub utterance
	 *  whose cancel() calls onCancel (to abort StreamingTTS). */
	enterProxyMode(onCancel: () => void) {
		this.endProxy(); // clean up any stale proxy first
		this.proxyCancel = onCancel;
	}

	/** End proxy mode and mark the proxy utterance as finished.
	 *  Safe to call multiple times (idempotent). */
	endProxy() {
		if (this.proxyUtterance && this.proxyNotify) {
			this.proxyUtterance.status = { type: "ended", reason: "finished" };
			this.proxyNotify();
		}
		this.proxyCancel = null;
		this.proxyUtterance = null;
		this.proxyNotify = null;
	}

	speak(text: string): SpeechSynthesisAdapter.Utterance {
		// ── Proxy mode: return controlled utterance for auto-TTS ──
		if (this.proxyCancel) {
			return this.createProxyUtterance(this.proxyCancel);
		}

		// ── Normal mode: chunked parallel fetch + sequential play ──
		const subscribers = new Set<() => void>();
		const controller = new AbortController();
		const notify = () => {
			for (const cb of subscribers) cb();
		};

		const utterance: SpeechSynthesisAdapter.Utterance = {
			status: { type: "starting" },
			cancel: () => {
				controller.abort();
				utterance.status = { type: "ended", reason: "cancelled" };
				notify();
			},
			subscribe: (callback) => {
				if (utterance.status.type === "ended") {
					queueMicrotask(callback);
					return () => {};
				}
				subscribers.add(callback);
				return () => {
					subscribers.delete(callback);
				};
			},
		};

		this.playChunked(stripMarkdown(text), controller, utterance, notify);
		return utterance;
	}

	private createProxyUtterance(
		onCancel: () => void,
	): SpeechSynthesisAdapter.Utterance {
		this.proxyCancel = null; // consumed

		const subscribers = new Set<() => void>();
		const notify = () => {
			for (const cb of subscribers) cb();
		};

		const utterance: SpeechSynthesisAdapter.Utterance = {
			status: { type: "running" },
			cancel: () => {
				onCancel();
				utterance.status = { type: "ended", reason: "cancelled" };
				notify();
				this.proxyUtterance = null;
				this.proxyNotify = null;
			},
			subscribe: (callback) => {
				if (utterance.status.type === "ended") {
					queueMicrotask(callback);
					return () => {};
				}
				subscribers.add(callback);
				return () => {
					subscribers.delete(callback);
				};
			},
		};

		this.proxyUtterance = utterance;
		this.proxyNotify = notify;
		return utterance;
	}

	private async playChunked(
		text: string,
		controller: AbortController,
		utterance: SpeechSynthesisAdapter.Utterance,
		notify: () => void,
	) {
		const { signal } = controller;
		const chunks = splitIntoChunks(text);
		if (chunks.length === 0) {
			utterance.status = { type: "ended", reason: "finished" };
			notify();
			return;
		}

		try {
			// Fire ALL fetches in parallel for minimal latency
			const blobPromises = chunks.map((chunk) =>
				fetchTTSBlob(chunk, this.voiceParams, signal),
			);

			let isFirst = true;
			for (const promise of blobPromises) {
				if (signal.aborted) return;
				const blob = await promise;
				if (!blob || blob.size === 0 || signal.aborted) continue;
				if (!isFirst) {
					await new Promise((r) => setTimeout(r, CHUNK_GAP_MS));
					if (signal.aborted) return;
				}
				isFirst = false;

				if (utterance.status.type !== "running") {
					utterance.status = { type: "running" };
					notify();
				}
				await playBlob(blob, signal);
			}

			if (!signal.aborted) {
				utterance.status = { type: "ended", reason: "finished" };
				notify();
			}
		} catch (error) {
			if (signal.aborted) return;
			utterance.status = { type: "ended", reason: "error", error };
			notify();
		}
	}
}
