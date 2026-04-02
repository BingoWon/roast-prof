import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Chat } from "./Chat";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
	return (
		<ErrorBoundary>
			<main className="h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30">
				{/* Top Navigation Bar */}
				<header className="absolute top-0 right-0 p-4 z-50 flex items-center justify-end gap-2">
					<Show when="signed-out">
						<div className="flex gap-2">
							<div className="px-4 py-2 text-sm font-semibold hover:bg-zinc-800 rounded-full transition cursor-pointer">
								<SignInButton />
							</div>
							<div className="px-4 py-2 text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white rounded-full transition cursor-pointer shadow">
								<SignUpButton />
							</div>
						</div>
					</Show>
					<Show when="signed-in">
						<UserButton />
					</Show>
				</header>
				<Show when="signed-in">
					<Chat />
				</Show>
				<Show when="signed-out">
					<div className="flex h-full w-full flex-col items-center justify-center text-center px-4">
						<div className="mb-8 w-24 h-24 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
							<span className="text-4xl text-zinc-500">🔒</span>
						</div>
						<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500 mb-3 tracking-tight">
							Authentication Required
						</h1>
						<p className="text-zinc-400 max-w-sm text-sm leading-relaxed mb-8">
							Please sign in to access the AI Playground and interact with the generative agents.
						</p>
						<div className="px-6 py-3 text-sm font-bold bg-white text-black hover:bg-zinc-200 rounded-full transition cursor-pointer shadow-lg">
							<SignInButton mode="modal">Sign in to continue</SignInButton>
						</div>
					</div>
				</Show>
			</main>
		</ErrorBoundary>
	);
}

export default App;
