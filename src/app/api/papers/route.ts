import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { classifyFile, ingestFile, listUserPapers } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const supabase = createServerClient();
	const papers = await listUserPapers(supabase, userId);
	return NextResponse.json(papers);
}

export async function POST(req: Request) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const formData = await req.formData();
	const file = formData.get("file") as File | null;
	if (!file) return NextResponse.json({ error: "缺少文件" }, { status: 400 });

	const classified = classifyFile(file.name);
	if (classified.category === "ocr" && !process.env.PADDLE_OCR_TOKEN) {
		return NextResponse.json(
			{ error: "缺少 PADDLE_OCR_TOKEN" },
			{ status: 500 },
		);
	}

	const buffer = await file.arrayBuffer();
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: Record<string, unknown>) => {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
				);
			};

			let ingestPaperId: string | undefined;
			try {
				const supabase = createServerClient();
				const fileExt = file.name.split(".").pop()?.toLowerCase();
				await ingestFile(buffer, {
					fileName: file.name.replace(/\.[^.]+$/, ""),
					fileExt,
					category: classified.category,
					ocrType: classified.ocrType,
					userId,
					supabase,
					env: {
						PADDLE_OCR_TOKEN: process.env.PADDLE_OCR_TOKEN,
						TMT_SECRET_ID: process.env.TMT_SECRET_ID,
						TMT_SECRET_KEY: process.env.TMT_SECRET_KEY,
						EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL!,
						EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY!,
						EMBEDDING_MODEL: process.env.EMBEDDING_MODEL!,
					},
					onStatus: (status, data) => {
						if (data?.paperId) ingestPaperId = data.paperId as string;
						send("status", { status, ...data });
					},
				});
			} catch (e) {
				const msg = e instanceof Error ? e.message : "处理失败";
				if (ingestPaperId) {
					const supabase = createServerClient();
					await supabase
						.from("papers")
						.update({ status: "failed" })
						.eq("id", ingestPaperId);
				}
				send("status", { status: "failed", error: msg });
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
