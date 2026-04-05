export type ToolStatus = "running" | "done" | "error";

export function getToolStatus(
	hasResult: boolean,
	isError: boolean,
): ToolStatus {
	if (isError) return "error";
	if (hasResult) return "done";
	return "running";
}
