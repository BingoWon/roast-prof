import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8787", // Wrangler default port
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		outDir: "dist",
	},
});
