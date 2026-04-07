import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [cloudflare(), react(), tailwindcss()],
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
