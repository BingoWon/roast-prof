import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { FC } from "react";

// ── Tool Call Status Model ───────────────────────────────────────────────────
// Maps tool lifecycle to visual states: running → done | error

export type ToolStatus = "running" | "done" | "error";

export function getToolStatus(
	hasResult: boolean,
	isError: boolean,
): ToolStatus {
	if (isError) return "error";
	if (hasResult) return "done";
	return "running";
}

export const toolStatusConfig: Record<
	ToolStatus,
	{ label: string; icon: FC<{ className?: string }>; colors: string }
> = {
	running: {
		label: "Running",
		icon: Clock,
		colors: "text-amber-400 border-amber-500/20 bg-amber-950/20",
	},
	done: {
		label: "Done",
		icon: CheckCircle,
		colors: "text-green-400 border-green-500/20 bg-green-950/20",
	},
	error: {
		label: "Error",
		icon: XCircle,
		colors: "text-red-400 border-red-500/20 bg-red-950/20",
	},
};
