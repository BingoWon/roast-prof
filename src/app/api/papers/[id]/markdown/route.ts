import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { getPaperMarkdown } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });
	const { id } = await params;
	const lang =
		(req.nextUrl.searchParams.get("lang") as "original" | "zh") || "original";
	const md = await getPaperMarkdown(createServerClient(), id, userId, lang);
	if (md === null)
		return NextResponse.json({ error: "未找到" }, { status: 404 });
	return new Response(md, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
