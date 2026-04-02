import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			{/* @ts-ignore: comply with strict prompt instructions not to pass publishableKey */}
			<ClerkProvider afterSignOutUrl="/">
				<App />
			</ClerkProvider>
		</StrictMode>,
	);
}
