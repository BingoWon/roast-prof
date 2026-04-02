/**
 * Decode Clerk __session JWT to extract userId (sub claim).
 * Production deployments should add full JWKS signature verification.
 */
export function getUserId(c: {
	req: { header: (name: string) => string | undefined };
}): string | null {
	const cookie = c.req.header("cookie") ?? "";
	const match = cookie.match(/__session=([^;]+)/);
	if (!match) return null;
	try {
		const [, payload] = match[1].split(".");
		const json = JSON.parse(
			atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
		);
		return json.sub ?? null;
	} catch {
		return null;
	}
}
