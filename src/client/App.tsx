import { Chat } from "./Chat";

export default function App() {
	return (
		<div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans">
			{/* Header Strip */}
			<header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between z-10 bg-zinc-900/50 backdrop-blur-md shrink-0">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
						😡
					</div>
					<h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
						Roast Prof
					</h1>
				</div>
				<div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">
					Model: DeepSeek V3 (OpenRouter)
				</div>
			</header>

			{/* Main Workspace */}
			<main className="flex-1 overflow-hidden">
				<Chat />
			</main>
		</div>
	);
}
