import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side Supabase client with full access (API routes only) */
export function createServerClient() {
	return createClient(url, serviceKey);
}

/** Client-side Supabase client (anon key, RLS enforced) */
export function createBrowserClient() {
	return createClient(url, anonKey);
}

export { anonKey as SUPABASE_ANON_KEY, url as SUPABASE_URL };
