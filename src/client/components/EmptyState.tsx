import { Bot, ChevronRight, CloudRain, Search } from "lucide-react";
import type { FC } from "react";

export const EmptyState: FC<{
	onPredefinedClick?: (text: string) => void;
}> = ({ onPredefinedClick }) => (
	<div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-700 pointer-events-none select-none">
		<div className="w-20 h-20 mb-6 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl pointer-events-none ring-1 ring-white/10 mt-12">
			<Bot className="w-10 h-10 text-zinc-400" />
		</div>
		<h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500 mb-3 tracking-tight">
			AI Playground
		</h2>
		<p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed mb-6">
			Experience AG-UI capabilities: Generative UI, reasoning transparency, and
			real-time tool execution.
		</p>

		{/* Predefined Prompts */}
		<div className="flex flex-col gap-2 w-full max-w-sm mx-auto pointer-events-auto">
			{[
				{
					label: "Generative UI (Weather Widget)",
					prompt: "What's the weather in San Francisco?",
					icon: CloudRain,
					color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
				},
				{
					label: "Tool Progress Streaming",
					prompt: "Search the web for the latest news on SpaceX",
					icon: Search,
					color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
				},
				{
					label: "Chain-of-Thought Reasoning",
					prompt: "How many 'r's in strawberry? Think step by step.",
					icon: Bot,
					color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
				},
			].map((item) => (
				<button
					type="button"
					key={item.label}
					onClick={() => onPredefinedClick?.(item.prompt)}
					className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group text-left shadow-sm"
				>
					<div className={`p-2 rounded-xl border ${item.color}`}>
						<item.icon className="w-4 h-4" />
					</div>
					<div className="flex-1 overflow-hidden">
						<div className="text-xs font-bold text-zinc-300 drop-shadow-sm">
							{item.label}
						</div>
						<div className="text-[11px] text-zinc-500 truncate mt-0.5">
							{item.prompt}
						</div>
					</div>
					<ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
				</button>
			))}
		</div>
	</div>
);
