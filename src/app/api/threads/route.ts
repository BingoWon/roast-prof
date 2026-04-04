import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const supabase = createServerClient();
	const { data } = await supabase
		.from("threads")
		.select("id, title, created_at, updated_at")
		.eq("user_id", userId)
		.order("updated_at", { ascending: false });

	return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

	const { id, title } = await req.json();
	const supabase = createServerClient();
	await supabase.from("threads").upsert(
		{
			id: id ?? crypto.randomUUID(),
			user_id: userId,
			title: title ?? "新对话",
		},
		{ onConflict: "id" },
	);
	return NextResponse.json({ ok: true });
}
