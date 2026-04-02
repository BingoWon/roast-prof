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
				<Chat />
			</main>
		</ErrorBoundary>
	);
}

export default App;
