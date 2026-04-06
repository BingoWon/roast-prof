/** Shared TTS utilities for sentence splitting, fetching, and playback.
 *  Used by both the manual speak adapter and the streaming auto-TTS system. */

// ── Sentence splitting ────────────────────────────────────────────────────

/** Splits on Chinese/English sentence-ending punctuation and newlines. */
export const SENTENCE_RE = /(?<=[。！？.!?\n])/;

/** Inter-chunk pause (ms) for natural pacing between audio segments. */
export const CHUNK_GAP_MS = 300;

/** Split text into chunks at sentence boundaries.
 *  Accumulates sentences until buffer reaches minChars, then cuts. */
export function splitIntoChunks(text: string, minChars = 60): string[] {
	const sentences = text.split(SENTENCE_RE).filter((s) => s.trim());
	if (sentences.length === 0) return [];

	const chunks: string[] = [];
	let buf = "";
	for (const s of sentences) {
		buf += s;
		if (buf.length >= minChars) {
			chunks.push(buf);
			buf = "";
		}
	}
	if (buf.trim()) {
		// Merge tiny trailing fragment into last chunk
		if (chunks.length > 0 && buf.trim().length < minChars / 2) {
			chunks[chunks.length - 1] += buf;
		} else {
			chunks.push(buf);
		}
	}
	return chunks;
}

/** Strip markdown syntax so TTS reads clean prose. */
export function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/!\[.*?\]\(.*?\)/g, "")
		.replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*{1,3}(.+?)\*{1,3}/g, "$1")
		.replace(/_{1,3}(.+?)_{1,3}/g, "$1")
		.replace(/~~(.+?)~~/g, "$1")
		.replace(/^>\s+/gm, "")
		.replace(/^[-*+]\s+/gm, "")
		.replace(/^\d+\.\s+/gm, "")
		.replace(/^[-*_]{3,}\s*$/gm, "")
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// ── Fetch & Playback ──────────────────────────────────────────────────────

export interface TTSVoiceParams {
	endpoint: string;
	voiceId?: string;
	speed?: number;
	stability?: number;
}

/** Fetch a TTS audio blob (does NOT play it). */
export function fetchTTSBlob(
	text: string,
	params: TTSVoiceParams,
	signal?: AbortSignal,
): Promise<Blob | null> {
	return fetch(params.endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text,
			voiceId: params.voiceId,
			speed: params.speed,
			stability: params.stability,
		}),
		signal,
	})
		.then((r) => (r.ok ? r.blob() : null))
		.catch(() => null);
}

/** Play a single audio Blob. Resolves when playback ends or is aborted. */
export function playBlob(blob: Blob, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		const cleanup = () => {
			URL.revokeObjectURL(url);
			resolve();
		};
		audio.addEventListener("ended", cleanup);
		audio.addEventListener("error", cleanup);
		signal.addEventListener(
			"abort",
			() => {
				audio.pause();
				cleanup();
			},
			{ once: true },
		);
		audio.play().catch(cleanup);
	});
}
