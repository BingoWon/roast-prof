import { Chat } from "./Chat";

function App() {
	return (
		<main className="h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30">
			<nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/40 border-b border-white/5">
				<div className="flex items-center gap-3 relative">
					<div className="absolute inset-0 bg-red-500 blur-xl opacity-20 pointer-events-none rounded-full" />
					<h1 className="text-xl font-bold tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
						Roast Prof AI
					</h1>
					<span className="px-2 py-0.5 mt-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase tracking-wider">
						Beta
					</span>
				</div>
			</nav>
			<div className="h-full pt-16">
				<Chat />
			</div>
		</main>
	);
}

export default App;
