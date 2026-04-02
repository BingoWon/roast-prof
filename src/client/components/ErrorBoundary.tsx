import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-100">
					<div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
						<div className="text-4xl">⚠️</div>
						<h1 className="text-lg font-bold">Something went wrong</h1>
						<p className="text-sm text-zinc-400 leading-relaxed">
							{this.state.error?.message || "An unexpected error occurred."}
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="mt-2 px-6 py-2.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-medium hover:bg-zinc-700 transition-colors"
						>
							Reload
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
