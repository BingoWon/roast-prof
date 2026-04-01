import { useChat } from "@ai-sdk/react";
import {
	AssistantRuntimeProvider,
	ComposerPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { FC } from "react";

const UserMessage: FC = () => (
	<MessagePrimitive.Root className="ml-auto bg-zinc-800 text-zinc-100 max-w-[80%] rounded-2xl px-5 py-3 mb-4 shadow-lg border border-zinc-700">
		<MessagePrimitive.Parts />
	</MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
	<MessagePrimitive.Root className="mr-auto bg-zinc-900 text-zinc-300 max-w-[85%] rounded-2xl px-5 py-3 mb-4 shadow-xl border border-zinc-800/50">
		<strong className="block text-red-500 mb-1 text-sm">🔥 暴躁教授</strong>
		<MessagePrimitive.Parts />
	</MessagePrimitive.Root>
);

export function Chat() {
	const chat = useChat();
	const runtime = useAISDKRuntime(chat);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="h-full w-full max-w-4xl mx-auto flex flex-col bg-zinc-950 px-4 md:px-0">
				<ThreadPrimitive.Root className="flex flex-col h-full relative">
					<ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-2 py-6">
						<ThreadPrimitive.Messages
							components={{
								UserMessage,
								AssistantMessage,
							}}
						/>
					</ThreadPrimitive.Viewport>

					<ThreadPrimitive.ViewportFooter className="pb-6 pt-2 px-2 sticky bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
						<ComposerPrimitive.Root className="flex w-full items-end gap-2 bg-zinc-900 border border-zinc-700/50 shadow-2xl rounded-3xl p-2 transition-all focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20">
							<ComposerPrimitive.Input
								placeholder="提出你的愚蠢问题..."
								rows={1}
								className="flex-1 max-h-40 resize-none bg-transparent px-4 py-3 outline-none text-zinc-100 placeholder-zinc-500"
							/>
							<ComposerPrimitive.Send asChild>
								<button
									type="submit"
									className="mb-1 mr-1 flex h-10 px-5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
								>
									发问
								</button>
							</ComposerPrimitive.Send>
						</ComposerPrimitive.Root>
					</ThreadPrimitive.ViewportFooter>
				</ThreadPrimitive.Root>
			</div>
		</AssistantRuntimeProvider>
	);
}
