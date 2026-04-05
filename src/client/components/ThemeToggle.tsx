import { Moon, Sun } from "lucide-react";
import type { FC } from "react";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle: FC = () => {
	const { theme, setTheme } = useTheme();

	return (
		<button
			type="button"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="relative flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
			aria-label="切换主题"
		>
			<Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-white" />
			<Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-zinc-800" />
		</button>
	);
};
