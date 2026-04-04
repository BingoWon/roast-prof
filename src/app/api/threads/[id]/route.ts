import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const { id } = await params;
	const { title } = await req.json();
	const supabase = createServerClient();
	await supabase
		.from("threads")
		.update({ title, updated_at: new Date().toISOString() })
		.eq("id", id)
		.eq("user_id", userId);
	return NextResponse.json({ ok: true });
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const { id } = await params;
	const supabase = createServerClient();
	await supabase.from("threads").delete().eq("id", id).eq("user_id", userId);
	return NextResponse.json({ ok: true });
}
