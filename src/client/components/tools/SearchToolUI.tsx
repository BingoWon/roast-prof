import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { ArrowRight, Globe, Search } from "lucide-react";
import type { FC } from "react";
import { getToolStatus } from "../../lib/tool-status";
import { ToolCallFallback } from "./ToolCallFallback";

export const SearchToolUI: FC<ToolCallMessagePartProps> = (props) => {
	const { args, result, isError } = props;
	const status = getToolStatus(result !== undefined, isError === true);
	const isRunning = status === "running";

	const a = args as { query: string } | undefined;
	const r = result as
		| {
				query: string;
				results: { title: string; url: string; snippet: string }[];
		  }
		| undefined;

	if (isError) return <ToolCallFallback {...props} />;

	return (
		<div className="mb-4 w-full rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-4 backdrop-blur-sm">
			<div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
				<div
					className={`p-1.5 rounded-lg ${isRunning ? "bg-blue-500/20 text-blue-400 animate-pulse" : "bg-emerald-500/20 text-emerald-400"}`}
				>
					{isRunning ? (
						<Search className="w-4 h-4" />
					) : (
						<Globe className="w-4 h-4" />
					)}
				</div>
				<span className="text-sm font-semibold text-zinc-200">
					{isRunning ? "Searching the web..." : "Web Search Results"}
				</span>
			</div>

			<div className="text-xs font-medium text-zinc-400 italic mb-4">
				Query: "{a?.query || "..."}"
			</div>

			{!isRunning && r?.results && (
				<div className="flex flex-col gap-3">
					{r.results.map((res) => (
						<div
							key={res.url}
							className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
						>
							<div className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
								{res.title}
								<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
							</div>
							<div className="text-[10px] text-zinc-500 truncate">
								{res.url}
							</div>
							<div className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
								{res.snippet}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
