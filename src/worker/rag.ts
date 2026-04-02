import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { inArray } from "drizzle-orm";
import type { DbClient } from "./db";
import { documents } from "./schema";

const DIMENSIONS = 1536;
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;

type EmbeddingEnv = {
	EMBEDDING_BASE_URL: string;
	EMBEDDING_API_KEY: string;
	EMBEDDING_MODEL: string;
};

function createEmbeddings(env: EmbeddingEnv) {
	return new OpenAIEmbeddings({
		model: env.EMBEDDING_MODEL,
		dimensions: DIMENSIONS,
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

// ── Ingest ────────────────────────────────────────────────────────────────────

export async function ingestMarkdown(
	markdown: string,
	opts: {
		source?: string;
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

	await opts.db.insert(documents).values(
		chunks.map((content, i) => ({
			id: ids[i],
			content,
			source: opts.source ?? null,
			createdAt: now,
		})),
	);

	const embeddings = createEmbeddings(opts.env);
	const store = createVectorStore(opts.vectorize, embeddings);

	const docs = chunks.map(
		(content, i) =>
			new Document({
				pageContent: content,
				metadata: { id: ids[i], source: opts.source ?? "" },
			}),
	);
	await store.addDocuments(docs, { ids });

	return { ids, chunks: chunks.length };
}

// ── Retrieve ──────────────────────────────────────────────────────────────────

export async function retrieveContext(
	query: string,
	opts: {
		topK?: number;
		db: DbClient;
		vectorize: VectorizeIndex;
		env: EmbeddingEnv;
	},
): Promise<string> {
	const embeddings = createEmbeddings(opts.env);
	const store = createVectorStore(opts.vectorize, embeddings);

	const results = await store.similaritySearchWithScore(query, opts.topK ?? 5);

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
