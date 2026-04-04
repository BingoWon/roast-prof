import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { renameUserPaper, unlinkUserPaper } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });
	const { id } = await params;
	const { title } = await req.json();
	await renameUserPaper(createServerClient(), userId, id, title);
	return NextResponse.json({ ok: true });
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });
	const { id } = await params;
	await unlinkUserPaper(createServerClient(), userId, id);
	return NextResponse.json({ ok: true });
}
