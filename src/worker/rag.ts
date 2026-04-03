import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "./db";
import { documents, papers } from "./schema";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;
const INSERT_BATCH = 15;
const DEFAULT_DIMENSIONS = 1536;

const PADDLE_JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";
const PADDLE_MODEL = "PaddleOCR-VL-1.5";

type EmbeddingEnv = {
	EMBEDDING_BASE_URL: string;
	EMBEDDING_API_KEY: string;
	EMBEDDING_MODEL: string;
	EMBEDDING_DIMENSIONS?: string;
};

function createEmbeddings(env: EmbeddingEnv) {
	return new OpenAIEmbeddings({
		model: env.EMBEDDING_MODEL,
		dimensions: Number(env.EMBEDDING_DIMENSIONS) || DEFAULT_DIMENSIONS,
		apiKey: env.EMBEDDING_API_KEY,
		configuration: { baseURL: env.EMBEDDING_BASE_URL },
	});
}

function createVectorStore(
	vectorize: VectorizeIndex,
	embeddings: OpenAIEmbeddings,
) {
	return new CloudflareVectorizeStore(embeddings, { index: vectorize });
}

// ── PaddleOCR Async API ─────────────────────────────────────────────────────

/** Submit a PDF to PaddleOCR for async processing. Returns jobId. */
export async function submitOcrJob(
	pdfBuffer: ArrayBuffer,
	token: string,
): Promise<string> {
	const form = new FormData();
	form.append(
		"file",
		new Blob([pdfBuffer], { type: "application/pdf" }),
		"document.pdf",
	);
	form.append("model", PADDLE_MODEL);
	form.append(
		"optionalPayload",
		JSON.stringify({
			useDocOrientationClassify: false,
			useDocUnwarping: false,
			useChartRecognition: false,
		}),
	);

	const res = await fetch(PADDLE_JOB_URL, {
		method: "POST",
		headers: { Authorization: `bearer ${token}` },
		body: form,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`PaddleOCR submit failed (${res.status}): ${text}`);
	}
	const json = (await res.json()) as { data: { jobId: string } };
	return json.data.jobId;
}

/** Check PaddleOCR job status. */
export async function checkOcrJob(
	jobId: string,
	token: string,
): Promise<{
	state: "pending" | "running" | "done" | "failed";
	jsonUrl?: string;
	progress?: { totalPages: number; extractedPages: number };
	error?: string;
}> {
	const res = await fetch(`${PADDLE_JOB_URL}/${jobId}`, {
		headers: { Authorization: `bearer ${token}` },
	});
	if (!res.ok) throw new Error(`PaddleOCR check failed: ${res.status}`);

	const { data } = (await res.json()) as {
		data: {
			state: string;
			resultUrl?: { jsonUrl?: string };
			extractProgress?: { totalPages: number; extractedPages: number };
			errorMsg?: string;
		};
	};

	return {
		state: data.state as "pending" | "running" | "done" | "failed",
		jsonUrl: data.resultUrl?.jsonUrl,
		progress: data.extractProgress,
		error: data.errorMsg,
	};
}

/** Fetch JSONL result from PaddleOCR and extract concatenated markdown. */
export async function fetchOcrMarkdown(jsonlUrl: string): Promise<string> {
	const res = await fetch(jsonlUrl);
	if (!res.ok) throw new Error(`Failed to fetch OCR result: ${res.status}`);

	const lines = (await res.text()).trim().split("\n");
	const parts: string[] = [];

	for (const line of lines) {
		if (!line.trim()) continue;
		const { result } = JSON.parse(line) as {
			result: {
				layoutParsingResults: Array<{ markdown: { text: string } }>;
			};
		};
		for (const page of result.layoutParsingResults) {
			parts.push(page.markdown.text);
		}
	}

	return parts.join("\n\n");
}

// ── Ingest Markdown ──────────────────────────────────────────────────────────

export async function ingestMarkdown(
	markdown: string,
	opts: {
		source?: string;
		userId?: string;
		paperId?: string;
		db: DbClient;
		vectorize: VectorizeIndex;
		env: EmbeddingEnv;
	},
): Promise<{ ids: string[]; chunks: number }> {
	const splitter = new MarkdownTextSplitter({
		chunkSize: CHUNK_SIZE,
		chunkOverlap: CHUNK_OVERLAP,
	});
	const chunks = await splitter.splitText(markdown);
	if (chunks.length === 0) return { ids: [], chunks: 0 };

	const ids = chunks.map(() => crypto.randomUUID());
	const now = Math.floor(Date.now() / 1000);

	const rows = chunks.map((content, i) => ({
		id: ids[i],
		content,
		source: opts.source ?? null,
		userId: opts.userId ?? null,
		paperId: opts.paperId ?? null,
		createdAt: now,
	}));

	for (let i = 0; i < rows.length; i += INSERT_BATCH) {
		await opts.db.insert(documents).values(rows.slice(i, i + INSERT_BATCH));
	}

	const embeddings = createEmbeddings(opts.env);
	const store = createVectorStore(opts.vectorize, embeddings);

	const docs = chunks.map(
		(content, i) =>
			new Document({
				pageContent: content,
				metadata: {
					id: ids[i],
					source: opts.source ?? "",
					userId: opts.userId ?? "",
					paperId: opts.paperId ?? "",
				},
			}),
	);

	try {
		await store.addDocuments(docs, { ids });
	} catch (e) {
		console.warn(
			"[RAG] Vectorize indexing skipped (local dev):",
			(e as Error).message,
		);
	}

	return { ids, chunks: chunks.length };
}

// ── Ingest PDF (PaddleOCR async) ────────────────────────────────────────────

/** Store PDF in R2, submit to PaddleOCR, create paper record with "processing" status. */
export async function startPdfIngestion(
	pdfBuffer: ArrayBuffer,
	opts: {
		title: string;
		userId: string;
		db: DbClient;
		r2: R2Bucket;
		ocrToken: string;
	},
): Promise<{ paperId: string; jobId: string }> {
	const paperId = crypto.randomUUID();
	const r2Key = `papers/${opts.userId}/${paperId}.pdf`;
	const now = Math.floor(Date.now() / 1000);

	await opts.r2.put(r2Key, pdfBuffer);

	const jobId = await submitOcrJob(pdfBuffer, opts.ocrToken);

	await opts.db.insert(papers).values({
		id: paperId,
		userId: opts.userId,
		title: opts.title,
		r2Key,
		chunks: 0,
		status: "processing",
		jobId,
		createdAt: now,
	});

	return { paperId, jobId };
}

/** Called when PaddleOCR job is done: fetch markdown, store in R2, chunk + vectorize. */
export async function finalizePaper(
	paperId: string,
	jsonlUrl: string,
	opts: {
		db: DbClient;
		r2: R2Bucket;
		vectorize: VectorizeIndex;
		env: EmbeddingEnv;
		userId: string;
	},
): Promise<{ chunks: number }> {
	const [paper] = await opts.db
		.select()
		.from(papers)
		.where(eq(papers.id, paperId))
		.limit(1);
	if (!paper) throw new Error("Paper not found");

	const markdown = await fetchOcrMarkdown(jsonlUrl);
	const markdownR2Key = `papers/${opts.userId}/${paperId}.md`;
	await opts.r2.put(markdownR2Key, markdown);

	const result = await ingestMarkdown(markdown, {
		source: paper.r2Key,
		userId: opts.userId,
		paperId,
		db: opts.db,
		vectorize: opts.vectorize,
		env: opts.env,
	});

	await opts.db
		.update(papers)
		.set({
			status: "ready",
			markdownR2Key,
			chunks: result.chunks,
		})
		.where(eq(papers.id, paperId));

	return { chunks: result.chunks };
}

// ── Delete Paper ─────────────────────────────────────────────────────────────

export async function deletePaper(
	paperId: string,
	opts: { db: DbClient; r2: R2Bucket; userId: string },
) {
	const [paper] = await opts.db
		.select()
		.from(papers)
		.where(eq(papers.id, paperId))
		.limit(1);
	if (!paper || paper.userId !== opts.userId) return;

	await opts.r2.delete(paper.r2Key);
	if (paper.markdownR2Key) await opts.r2.delete(paper.markdownR2Key);

	const docRows = await opts.db
		.select({ id: documents.id })
		.from(documents)
		.where(eq(documents.paperId, paperId));

	if (docRows.length > 0) {
		const docIds = docRows.map((r) => r.id);
		for (let i = 0; i < docIds.length; i += INSERT_BATCH) {
			await opts.db
				.delete(documents)
				.where(inArray(documents.id, docIds.slice(i, i + INSERT_BATCH)));
		}
	}

	await opts.db.delete(papers).where(eq(papers.id, paperId));
}

// ── List Papers ──────────────────────────────────────────────────────────────

export async function listPapers(db: DbClient, userId: string) {
	return db
		.select({
			id: papers.id,
			title: papers.title,
			chunks: papers.chunks,
			status: papers.status,
			createdAt: papers.createdAt,
		})
		.from(papers)
		.where(eq(papers.userId, userId));
}

// ── Get Paper Markdown ───────────────────────────────────────────────────────

export async function getPaperMarkdown(
	paperId: string,
	opts: { db: DbClient; r2: R2Bucket; userId: string },
): Promise<string | null> {
	const [paper] = await opts.db
		.select()
		.from(papers)
		.where(eq(papers.id, paperId))
		.limit(1);
	if (!paper || paper.userId !== opts.userId || !paper.markdownR2Key)
		return null;

	const obj = await opts.r2.get(paper.markdownR2Key);
	if (!obj) return null;
	return obj.text();
}

// ── Retrieve Context (filtered by user + optional papers) ────────────────────

export async function retrieveContext(
	query: string,
	opts: {
		userId: string;
		paperIds?: string[];
		topK?: number;
		db: DbClient;
		vectorize: VectorizeIndex;
		env: EmbeddingEnv;
	},
): Promise<string> {
	const embeddings = createEmbeddings(opts.env);
	const store = createVectorStore(opts.vectorize, embeddings);

	const filter: Record<string, unknown> = { userId: opts.userId };
	if (opts.paperIds?.length === 1) {
		filter.paperId = opts.paperIds[0];
	} else if (opts.paperIds && opts.paperIds.length > 1) {
		filter.paperId = { $in: opts.paperIds };
	}

	let results: [Document, number][];
	try {
		results = await store.similaritySearchWithScore(
			query,
			opts.topK ?? 5,
			filter,
		);
	} catch {
		return "";
	}

	const matchedIds = results
		.filter(([, score]) => score > 0.4)
		.map(([doc]) => doc.metadata.id as string);

	if (matchedIds.length === 0) return "";

	const rows = await opts.db
		.select({ id: documents.id, content: documents.content })
		.from(documents)
		.where(inArray(documents.id, matchedIds));

	const contentMap = new Map(rows.map((r) => [r.id, r.content]));
	return matchedIds
		.map((id) => contentMap.get(id))
		.filter(Boolean)
		.join("\n\n---\n\n");
}
