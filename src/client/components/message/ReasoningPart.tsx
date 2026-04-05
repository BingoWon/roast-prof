import { useMessagePartReasoning } from "@assistant-ui/react";
import { ChevronRight, Copy, Check } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";

const AUTO_CLOSE_DELAY = 1000;

export const ReasoningPart: FC = () => {
	const reasoning = useMessagePartReasoning();
	const isStreaming = reasoning?.status?.type === "running";

	const [open, setOpen] = useState(false);
	const [hasAutoClosed, setHasAutoClosed] = useState(false);
	const hasEverStreamedRef = useRef(false);

	const startTimeRef = useRef<number | null>(null);
	const [duration, setDuration] = useState<number | undefined>(undefined);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (isStreaming) {
			hasEverStreamedRef.current = true;
			if (startTimeRef.current === null) startTimeRef.current = Date.now();
		} else if (startTimeRef.current !== null) {
			setDuration(Math.ceil((Date.now() - startTimeRef.current) / 1000));
			startTimeRef.current = null;
		}
	}, [isStreaming]);

	useEffect(() => {
		if (isStreaming && !open) setOpen(true);
	}, [isStreaming, open]);

	useEffect(() => {
		if (hasEverStreamedRef.current && !isStreaming && open && !hasAutoClosed) {
			const timer = setTimeout(() => {
				setOpen(false);
				setHasAutoClosed(true);
			}, AUTO_CLOSE_DELAY);
			return () => clearTimeout(timer);
		}
	}, [isStreaming, open, hasAutoClosed]);

	if (!reasoning?.text) return null;

	const label = isStreaming
		? "思考中…"
		: duration !== undefined
			? `思考 ${duration}s`
			: "思考";

	return (
		<div className="my-1">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-1.5 py-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors cursor-pointer group"
			>
				<ChevronRight
					className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
				/>
				{isStreaming && (
					<span className="relative flex h-1.5 w-1.5">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 dark:bg-zinc-500 opacity-75" />
						<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-400 dark:bg-zinc-500" />
					</span>
				)}
				<span className="font-medium">{label}</span>
				{!isStreaming && !open && reasoning.text && (
					<span className="ml-0.5 truncate max-w-[200px] opacity-50 hidden sm:block">
						{reasoning.text.slice(0, 60).replace(/\n/g, " ")}…
					</span>
				)}
			</button>

			{open && (
				<div className="ml-1.5 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 mt-1 mb-2">
					<div
						className="max-h-64 overflow-y-auto"
						ref={(el) => {
							if (el && isStreaming) el.scrollTop = el.scrollHeight;
						}}
					>
						<p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400 dark:text-zinc-500 italic">
							{reasoning.text}
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							navigator.clipboard.writeText(reasoning.text ?? "");
							setCopied(true);
							setTimeout(() => setCopied(false), 1500);
						}}
						className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors cursor-pointer"
					>
						{copied ? (
							<Check className="h-2.5 w-2.5 text-emerald-500" />
						) : (
							<Copy className="h-2.5 w-2.5" />
						)}
						{copied ? "已复制" : "复制"}
					</button>
				</div>
			)}
		</div>
	);
};
