import { makeAssistantToolUI } from "@assistant-ui/react";
import { Globe, Search } from "lucide-react";
import { type ExaResult, ExaResultList } from "./ExaResultList";

type Args = { query: string };
type Result = { results: ExaResult[] };

export const SearchToolUI = makeAssistantToolUI<Args, Result>({
	toolName: "search_web",
	render: ({ args, result, status }) => {
		const isRunning = status.type === "running";
		const results = result?.results ?? [];

		return (
			<div className="mb-2 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/50 overflow-hidden">
				<div className="flex items-center gap-2 px-3 py-2 text-xs">
					<div
						className={`p-1 rounded-md ${isRunning ? "bg-blue-100 dark:bg-blue-500/20 text-blue-500 animate-pulse" : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500"}`}
					>
						{isRunning ? (
							<Search className="w-3 h-3" />
						) : (
							<Globe className="w-3 h-3" />
						)}
					</div>
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						{isRunning ? "搜索中..." : `${results.length} 条结果`}
					</span>
					<span className="text-zinc-400 dark:text-zinc-500 italic truncate">
						{args?.query}
					</span>
				</div>
				{!isRunning && results.length > 0 && (
					<div className="px-1 pb-1.5">
						<ExaResultList results={results} />
					</div>
				)}
			</div>
		);
	},
});
