import { makeAssistantToolUI } from "@assistant-ui/react";
import { Check, Loader2 } from "lucide-react";

type Args = { content: string };
type Result = { success: boolean; message: string };

export const SaveMemoryToolUI = makeAssistantToolUI<Args, Result>({
	toolName: "save_memory",
	render: ({ args, status }) => {
		if (status.type === "running") {
			return (
				<div className="mb-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
					<Loader2 className="w-3.5 h-3.5 animate-spin" /> 正在保存记忆...
				</div>
			);
		}
		if (status.type === "incomplete") {
			return <div className="mb-2 text-xs text-red-500">记忆保存失败</div>;
		}
		return (
			<div className="mb-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
				<Check className="w-3.5 h-3.5" /> 已记住：{args?.content}
			</div>
		);
	},
});
