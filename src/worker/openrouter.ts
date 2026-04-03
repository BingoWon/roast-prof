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
