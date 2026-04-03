import { Globe, Languages, Loader2 } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const PaperViewer: FC<{
	paperId: string;
	lang?: string | null;
}> = ({ paperId, lang }) => {
	const hasTranslation = lang === "en";
	const [viewLang, setViewLang] = useState<"original" | "zh">(
		hasTranslation ? "zh" : "original",
	);
	const [markdown, setMarkdown] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		const url =
			hasTranslation && viewLang === "zh"
				? `/api/papers/${paperId}/markdown?lang=zh`
				: `/api/papers/${paperId}/markdown`;

		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error("加载失败");
				return res.text();
			})
			.then((text) => {
				if (!cancelled) {
					setMarkdown(text);
					setLoading(false);
				}
			})
			.catch((e) => {
				if (!cancelled) {
					setError(e.message);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [paperId, viewLang, hasTranslation]);

	const toggleLang = () => setViewLang((v) => (v === "zh" ? "original" : "zh"));

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
				{error}
			</div>
		);
	}

	return (
		<div className="flex-1 relative overflow-y-auto">
			{/* Content */}
			<div className="px-8 py-6">
				<div className="max-w-3xl mx-auto">
					<div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{markdown ?? ""}
						</ReactMarkdown>
					</div>
				</div>
			</div>

			{/* Floating language toggle (English papers only) */}
			{hasTranslation && (
				<button
					type="button"
					onClick={toggleLang}
					className="group fixed bottom-6 right-6 z-30 flex items-center gap-2 h-10 rounded-full bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 shadow-lg backdrop-blur-sm transition-all hover:pr-4 px-3 cursor-pointer"
					title={viewLang === "zh" ? "切换到英文原版" : "切换到中文翻译"}
				>
					{viewLang === "zh" ? (
						<Globe className="w-4 h-4 shrink-0" />
					) : (
						<Languages className="w-4 h-4 shrink-0" />
					)}
					<span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium transition-all group-hover:max-w-32">
						{viewLang === "zh" ? "英文原版" : "中文翻译"}
					</span>
				</button>
			)}
		</div>
	);
};
