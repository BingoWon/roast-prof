import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });
	const { id } = await params;

	const supabase = createServerClient();
	const { data: link } = await supabase
		.from("user_papers")
		.select("title, paper_id")
		.eq("user_id", userId)
		.eq("paper_id", id)
		.single();
	if (!link) return NextResponse.json({ error: "未找到" }, { status: 404 });

	const { data: paper } = await supabase
		.from("papers")
		.select("hash, file_ext")
		.eq("id", id)
		.single();
	if (!paper) return NextResponse.json({ error: "未找到" }, { status: 404 });

	const ext = paper.file_ext ?? "pdf";
	const storagePath = `papers/${paper.hash}.${ext === "docx" ? "docx" : ext === "img" ? "img" : "pdf"}`;
	const { data } = await supabase.storage.from("papers").download(storagePath);
	if (!data) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

	const filename = encodeURIComponent(link.title);
	return new Response(data, {
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition": `attachment; filename="${filename}.${ext}"; filename*=UTF-8''${filename}.${ext}`,
		},
	});
}
