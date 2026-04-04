import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPaperMarkdown, renameUserPaper } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase";

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });
	const { id } = await params;

	const { fileName, fileExt } = await req
		.json()
		.catch(() => ({ fileName: undefined, fileExt: undefined }));
	const supabase = createServerClient();
	const md = await getPaperMarkdown(supabase, id, userId);
	if (!md) return NextResponse.json({ error: "未找到" }, { status: 404 });

	const excerpt = md.slice(0, 500);
	const fullName = fileName
		? fileExt
			? `${fileName}.${fileExt}`
			: fileName
		: null;
	const hintStr = fullName ? `\n文件名：${fullName}` : "";

	const res = await fetch(
		`${process.env.OPENROUTER_BASE_URL}/chat/completions`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
			},
			body: JSON.stringify({
				model: process.env.MODEL,
				messages: [
					{
						role: "user",
						content: `根据以下资料内容生成简洁中文标题，6-12个字，无标点无引号，只回复标题：${hintStr}\n${excerpt}`,
					},
				],
			}),
		},
	);
	// biome-ignore lint/suspicious/noExplicitAny: LLM response
	const data = (await res.json()) as any;
	const title = (data.choices?.[0]?.message?.content ?? "")
		.trim()
		.replace(/["""''「」『』。，！？、：；]/g, "");

	if (title) await renameUserPaper(supabase, userId, id, title);
	return NextResponse.json({ title });
}
