/** Structured JSON logger for Cloudflare Workers Logs. */

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, data: Record<string, unknown>) {
	const entry = { level, ts: Date.now(), ...data };
	if (level === "error") console.error(entry);
	else if (level === "warn") console.warn(entry);
	else console.log(entry);
}

export const log = {
	info: (data: Record<string, unknown>) => emit("info", data),
	warn: (data: Record<string, unknown>) => emit("warn", data),
	error: (data: Record<string, unknown>) => emit("error", data),
};
