import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		cloudflare(),
		react(),
		tailwindcss(),
		// Cache static character images in dev server
		{
			name: "cache-characters",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url?.startsWith("/characters/")) {
						res.setHeader(
							"Cache-Control",
							"public, max-age=31536000, immutable",
						);
					}
					next();
				});
			},
		},
	],
	optimizeDeps: {
		entries: ["index.html", "src/client/**/*.{ts,tsx}"],
	},
	build: {
		target: "esnext",
		rollupOptions: {
			output: {
				// Vite 8 / Rolldown requires function form for manualChunks
				manualChunks(id: string) {
					if (
						id.includes("node_modules/react-dom") ||
						id.includes("node_modules/react/")
					)
						return "react";
					if (id.includes("node_modules/@assistant-ui/")) return "assistant-ui";
					if (
						id.includes("node_modules/ai/") ||
						id.includes("node_modules/@ai-sdk/")
					)
						return "ai-sdk";
					if (id.includes("node_modules/@clerk/")) return "clerk";
					if (
						id.includes("node_modules/react-markdown") ||
						id.includes("node_modules/remark-gfm")
					)
						return "markdown";
				},
			},
		},
	},
});
