import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { ChevronDown, Wrench } from "lucide-react";
import { type FC, useState } from "react";
import { getToolStatus, toolStatusConfig } from "../../lib/tool-status";

export const ToolCallFallback: FC<ToolCallMessagePartProps> = ({
	toolName,
	args,
	argsText,
	result,
	isError,
}) => {
	const [open, setOpen] = useState(true);
	const hasResult = result !== undefined;
	const status = getToolStatus(hasResult, isError === true);
	const { label, icon: StatusIcon, colors } = toolStatusConfig[status];
	const isRunning = status === "running";

	return (
		<div
			className={`mb-2 rounded-2xl border overflow-hidden transition-all duration-200 ${colors}`}
		>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
			>
				<Wrench className="h-3.5 w-3.5 shrink-0 text-current/60" />
				<span className="text-[11px] font-semibold tracking-wider uppercase select-none">
					{toolName}
				</span>
				{/* Status badge */}
				<span className="ml-1.5 flex items-center gap-1 rounded-full border border-current/20 bg-current/5 px-2 py-0.5">
					<StatusIcon
						className={`h-2.5 w-2.5 ${isRunning ? "animate-pulse" : ""}`}
					/>
					<span
						className={`text-[9px] font-semibold tracking-widest uppercase ${isRunning ? "animate-pulse" : ""}`}
					>
						{label}
					</span>
				</span>
				<ChevronDown
					className={`ml-auto h-3 w-3 opacity-40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open && (
				<div className="border-t border-current/10 divide-y divide-current/10">
					{(args !== undefined || argsText) && (
						<div className="px-4 py-3">
							<div className="text-[10px] font-semibold opacity-40 uppercase tracking-widest mb-1.5">
								Parameters
							</div>
							<pre className="text-[11px] opacity-70 font-mono whitespace-pre-wrap break-all bg-black/20 rounded-lg px-3 py-2">
								{argsText || JSON.stringify(args, null, 2)}
							</pre>
						</div>
					)}
					{result !== undefined && (
						<div className="px-4 py-3">
							<div className="text-[10px] font-semibold opacity-40 uppercase tracking-widest mb-1.5">
								{isError ? "Error" : "Result"}
							</div>
							<pre className="text-[11px] opacity-70 font-mono whitespace-pre-wrap break-all bg-black/20 rounded-lg px-3 py-2">
								{typeof result === "string"
									? result
									: JSON.stringify(result, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
