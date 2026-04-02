// ── Wire format types for Assistant-UI → OpenRouter conversion ────────────────

export type ChatMessagePart =
	| { type: "text"; text: string }
	| { type: "image"; image?: string; url?: string }
	| { type: "image_url"; image_url?: { url: string }; url?: string }
	| { type: "file"; mediaType?: string; url?: string; name?: string };

export type ChatRequestMessage = {
	id?: string;
	role: string;
	parts?: ChatMessagePart[];
	content?: string;
};

// ── OpenRouter format builders ───────────────────────────────────────────────

type OpenRouterContentPart =
	| { type: "text"; text: string }
	| { type: "image_url"; image_url: { url: string } }
	| { type: "file"; file: { filename: string; file_data: string } }
	| { type: "input_audio"; input_audio: { data: string; format: string } }
	| { type: "video_url"; video_url: { url: string } };

function extractBase64(dataUrl: string): string {
	const idx = dataUrl.indexOf(",");
	return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function toOpenRouterPart(p: ChatMessagePart): OpenRouterContentPart | null {
	if (p.type === "text") return { type: "text", text: p.text };

	if (p.type === "image" || p.type === "image_url") {
		const url =
			p.type === "image_url"
				? (p.image_url?.url ?? p.url ?? "")
				: (p.image ?? p.url ?? "");
		return { type: "image_url", image_url: { url } };
	}

	if (p.type === "file") {
		const url = p.url ?? "";
		const mime = p.mediaType ?? "application/octet-stream";
		const filename = p.name ?? `attachment.${mime.split("/")[1] ?? "bin"}`;

		if (mime.startsWith("image/"))
			return { type: "image_url", image_url: { url } };
		if (mime === "application/pdf")
			return { type: "file", file: { filename, file_data: url } };
		if (mime.startsWith("audio/"))
			return {
				type: "input_audio",
				input_audio: {
					data: extractBase64(url),
					format: mime.split("/")[1] ?? "wav",
				},
			};
		if (mime.startsWith("video/"))
			return { type: "video_url", video_url: { url } };
	}

	return null;
}

export function buildOpenRouterMessages(
	uiMessages: ChatRequestMessage[],
	systemPrompt: string,
): Array<{ role: string; content: string | OpenRouterContentPart[] }> {
	const result: Array<{
		role: string;
		content: string | OpenRouterContentPart[];
	}> = [{ role: "system", content: systemPrompt }];

	for (const m of uiMessages) {
		if (m.parts?.length) {
			const parts = m.parts
				.map(toOpenRouterPart)
				.filter((p): p is OpenRouterContentPart => p !== null);
			result.push({ role: m.role, content: parts });
		} else {
			result.push({ role: m.role, content: m.content ?? "" });
		}
	}
	return result;
}

// ── SSE streaming transform ─────────────────────────────────────────────────
// OpenRouter returns `delta.reasoning` for reasoning models.
// We inject it into `<think>...</think>` tags for extractReasoningMiddleware.

export function transformReasoningSSE(response: Response): Response {
	if (!response.body) return response;

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	let buffer = "";
	let inReasoning = false;

	const transform = new TransformStream<Uint8Array, Uint8Array>({
		transform(chunk, controller) {
			buffer += decoder.decode(chunk, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) {
					controller.enqueue(encoder.encode(`${line}\n`));
					continue;
				}
				const data = line.slice(6).trim();

				if (data === "[DONE]") {
					if (inReasoning) {
						const closing = { choices: [{ delta: { content: "</think>" } }] };
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify(closing)}\n`),
						);
						inReasoning = false;
					}
					controller.enqueue(encoder.encode(`${line}\n`));
					continue;
				}

				try {
					const json = JSON.parse(data);
					let modified = false;

					if (Array.isArray(json.choices)) {
						for (const choice of json.choices) {
							if (
								typeof choice.delta?.reasoning === "string" &&
								choice.delta.reasoning.length > 0
							) {
								let contentInjection = "";
								if (!inReasoning) {
									contentInjection += "<think>";
									inReasoning = true;
								}
								contentInjection += choice.delta.reasoning;

								choice.delta.content =
									(choice.delta.content || "") + contentInjection;
								delete choice.delta.reasoning;
								modified = true;
							} else if (
								inReasoning &&
								(choice.delta?.content !== undefined || choice.finish_reason)
							) {
								choice.delta = choice.delta || {};
								choice.delta.content = `</think>${choice.delta.content || ""}`;
								inReasoning = false;
								modified = true;
							}
						}
					}

					if (modified || (json.choices && json.choices.length > 0)) {
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify(json)}\n`),
						);
					} else {
						controller.enqueue(encoder.encode(`${line}\n`));
					}
				} catch {
					controller.enqueue(encoder.encode(`${line}\n`));
				}
			}
		},
		flush(controller) {
			if (inReasoning) {
				const closing = { choices: [{ delta: { content: "</think>" } }] };
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(closing)}\n`),
				);
			}
			if (buffer) controller.enqueue(encoder.encode(buffer));
		},
	});

	return new Response(response.body.pipeThrough(transform), {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}
