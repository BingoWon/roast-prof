import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { checkPaperByHash } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const hash = req.nextUrl.searchParams.get("hash");
	if (!hash)
		return NextResponse.json({ error: "缺少 hash 参数" }, { status: 400 });

	const supabase = createServerClient();
	const result = await checkPaperByHash(supabase, hash);
	if (!result.exists) return NextResponse.json({ exists: false });

	// Auto-link user
	await supabase
		.from("user_papers")
		.upsert(
			{ user_id: userId, paper_id: result.paperId },
			{ onConflict: "user_id,paper_id" },
		);
	return NextResponse.json(result);
}
