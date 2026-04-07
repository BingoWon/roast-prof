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
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom"],
					"assistant-ui": [
						"@assistant-ui/react",
						"@assistant-ui/react-ai-sdk",
						"@assistant-ui/react-markdown",
					],
					"ai-sdk": ["ai", "@ai-sdk/react"],
					clerk: ["@clerk/react"],
					markdown: ["react-markdown", "remark-gfm"],
				},
			},
		},
	},
});
