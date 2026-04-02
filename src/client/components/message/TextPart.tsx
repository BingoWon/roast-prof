import { useMessagePartText } from "@assistant-ui/react";
import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const TextPart: FC = () => {
	const { text } = useMessagePartText();
	if (!text) return null;
	return (
		<div className="relative rounded-3xl rounded-tl-sm bg-zinc-900/80 px-6 py-4 text-zinc-200 shadow-xl border border-white/5 backdrop-blur-xl transition-all hover:border-white/10 overflow-x-auto">
			<div className="prose prose-invert prose-sm prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 break-words">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
			</div>
		</div>
	);
};
