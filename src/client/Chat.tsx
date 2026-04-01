import { useChat } from "@ai-sdk/react";
import {
	AssistantRuntimeProvider,
	AttachmentPrimitive,
	ComposerPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
	useMessagePartReasoning,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import {
	Bot,
	ChevronDown,
	Paperclip,
	Send,
	Trash2,
	User,
	X,
} from "lucide-react";
import { type FC, useState } from "react";

// ── Reasoning part ────────────────────────────────────────────────────────────

const ReasoningPart: FC = () => {
	const reasoning = useMessagePartReasoning();
	const [open, setOpen] = useState(false);

	if (!reasoning?.text) return null;

	const isStreaming =
		!reasoning.text.endsWith("\n") || reasoning.text.length < 20;

	return (
		<div className="mb-3 rounded-2xl border border-violet-500/15 bg-violet-950/30 overflow-hidden transition-all">
			{/* Header */}
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-violet-500/5 transition-colors"
			>
				{/* Thinking indicator */}
				<span className="relative flex h-3 w-3 shrink-0">
					{isStreaming ? (
						<>
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
						</>
					) : (
						<span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500/50" />
					)}
				</span>
				<span className="text-xs font-semibold text-violet-400 tracking-wide">
					{isStreaming ? "正在思考..." : "思考过程"}
				</span>
				<ChevronDown
					className={`ml-auto h-3.5 w-3.5 text-violet-500/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{/* Content */}
			{open && (
				<div className="border-t border-violet-500/10 px-4 py-3 max-h-64 overflow-y-auto">
					<p className="text-xs leading-relaxed text-violet-300/70 font-mono whitespace-pre-wrap">
						{reasoning.text}
					</p>
				</div>
			)}
		</div>
	);
};

// ── Attachment components ─────────────────────────────────────────────────────

const UserAttachment: FC = () => (
	<AttachmentPrimitive.Root className="group relative flex h-14 w-40 items-center justify-between rounded-xl bg-black/10 px-3 py-2 backdrop-blur-md border border-white/5 transition-all hover:bg-black/20">
		<div className="flex items-center gap-2 overflow-hidden">
			<AttachmentPrimitive.unstable_Thumb className="h-10 w-10 shrink-0 rounded-lg bg-white/10 object-cover" />
			<span className="truncate text-xs font-medium text-white/80">
				<AttachmentPrimitive.Name />
			</span>
		</div>
	</AttachmentPrimitive.Root>
);

const ComposerAttachment: FC = () => (
	<AttachmentPrimitive.Root className="group relative flex h-16 w-48 items-center justify-between rounded-2xl bg-zinc-800/80 px-3 py-2 shadow-inner border border-white/5 transition-all">
		<div className="flex items-center gap-3 overflow-hidden">
			<AttachmentPrimitive.unstable_Thumb className="h-12 w-12 shrink-0 rounded-xl bg-zinc-900 object-cover shadow-sm" />
			<span className="truncate text-xs font-semibold text-zinc-300">
				<AttachmentPrimitive.Name />
			</span>
		</div>
		<AttachmentPrimitive.Remove className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110 active:scale-95">
			<X className="w-3.5 h-3.5" />
		</AttachmentPrimitive.Remove>
	</AttachmentPrimitive.Root>
);

// ── Message components ────────────────────────────────────────────────────────

const UserMessage: FC = () => (
	<MessagePrimitive.Root className="ml-auto flex max-w-[85%] flex-col items-end mb-6">
		<div className="flex items-center gap-2 mb-2">
			<span className="text-xs font-medium text-zinc-400">你</span>
			<div className="h-6 w-6 rounded-full bg-gradient-to-tr from-orange-400 to-amber-600 flex items-center justify-center text-white shadow-lg">
				<User className="w-3.5 h-3.5" />
			</div>
		</div>
		<div className="relative rounded-3xl rounded-tr-sm bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 py-4 text-zinc-100 shadow-2xl border border-white/5 backdrop-blur-xl">
			<div className="mb-3 flex flex-wrap gap-2">
				<MessagePrimitive.Attachments
					components={{ Attachment: UserAttachment }}
				/>
			</div>
			<div className="leading-relaxed whitespace-pre-wrap flex flex-col gap-2">
				<MessagePrimitive.Parts />
			</div>
		</div>
	</MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
	<MessagePrimitive.Root className="mr-auto flex max-w-[85%] flex-col items-start mb-6">
		<div className="flex items-center gap-2 mb-2">
			<div className="h-6 w-6 rounded-full bg-gradient-to-tr from-red-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
				<Bot className="w-3.5 h-3.5" />
			</div>
			<span className="text-xs font-bold text-red-500 tracking-wide uppercase">
				暴躁教授
			</span>
		</div>
		<div className="w-full">
			{/* Reasoning panel sits above the reply bubble */}
			<MessagePrimitive.Parts
				components={{
					Reasoning: ReasoningPart,
				}}
			/>
		</div>
	</MessagePrimitive.Root>
);

// ── Main Chat component ───────────────────────────────────────────────────────

export function Chat() {
	const chat = useChat({
		onError: (err: unknown) => {
			console.error("[Frontend] Chat Error:", err);
			alert(
				`⚠️ 聊天发送错误:\n${(err as Error).name}: ${(err as Error).message}\n请检查控制台或后端日志确认详情。`,
			);
		},
		onFinish: (msg) => {
			console.log("[Frontend] Chat Finished successfully:", msg);
		},
	});
	const runtime = useAISDKRuntime(chat);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="flex h-full w-full flex-col bg-zinc-950 px-4 md:px-0 relative overflow-hidden">
				{/* Premium background decorative blur */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

				<ThreadPrimitive.Root className="flex flex-col h-full w-full max-w-4xl mx-auto relative z-10">
					<ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
						{chat.messages.length === 0 && (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-1000">
								<div className="w-20 h-20 mb-6 rounded-3xl bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/20">
									<Bot className="w-10 h-10 text-white" />
								</div>
								<h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 mb-3 tracking-tight">
									我是暴躁教授
								</h2>
								<p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
									少废话。直接丢问题、图片、视频或者文档过来。
									<br />
									别指望我会给你什么好脸色。
								</p>
							</div>
						)}
						<ThreadPrimitive.Messages
							components={{
								UserMessage,
								AssistantMessage,
							}}
						/>
					</ThreadPrimitive.Viewport>

					<ThreadPrimitive.ViewportFooter className="pb-8 pt-4 px-4 sticky bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent backdrop-blur-sm">
						<ComposerPrimitive.Root className="flex w-full flex-col gap-3 rounded-3xl bg-zinc-900/60 p-3 shadow-2xl border border-zinc-800 backdrop-blur-2xl transition-all focus-within:border-orange-500/40 focus-within:bg-zinc-900/80 focus-within:shadow-orange-500/10 focus-within:ring-4 focus-within:ring-orange-500/10">
							<div className="flex flex-wrap gap-3 px-2 pt-2 empty:hidden">
								<ComposerPrimitive.Attachments
									components={{ Attachment: ComposerAttachment }}
								/>
							</div>
							<div className="flex items-end gap-2">
								<ComposerPrimitive.AddAttachment className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:scale-95">
									<Paperclip className="h-5 w-5" />
								</ComposerPrimitive.AddAttachment>

								<ComposerPrimitive.Input
									placeholder="输入指令，或者拖拽文件至此..."
									rows={1}
									className="flex-1 max-h-40 resize-none bg-transparent px-2 py-3.5 outline-none text-zinc-100 placeholder-zinc-500 text-sm leading-relaxed"
								/>

								<div className="flex items-center gap-1 mb-1 mr-1">
									<ComposerPrimitive.Cancel className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 active:scale-95">
										<Trash2 className="h-4 w-4" />
									</ComposerPrimitive.Cancel>
									<ComposerPrimitive.Send asChild>
										<button
											type="submit"
											className="flex h-10 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-orange-500/25 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
										>
											<Send className="h-4 w-4 ml-0.5" />
										</button>
									</ComposerPrimitive.Send>
								</div>
							</div>
						</ComposerPrimitive.Root>
						<div className="text-center mt-4">
							<span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
								Powered by AG-UI & Xiaomi Mimo Omni
							</span>
						</div>
					</ThreadPrimitive.ViewportFooter>
				</ThreadPrimitive.Root>
			</div>
		</AssistantRuntimeProvider>
	);
}
