import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "ghost" | "outline" | "destructive";
type Size = "default" | "sm" | "icon";

const variantStyles: Record<Variant, string> = {
	default:
		"bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 shadow-sm",
	ghost:
		"hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
	outline:
		"border border-zinc-200 dark:border-zinc-700 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800",
	destructive:
		"bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
};

const sizeStyles: Record<Size, string> = {
	default: "h-9 px-4 py-2",
	sm: "h-8 px-3 text-xs",
	icon: "h-9 w-9",
};

export const Button = forwardRef<
	HTMLButtonElement,
	ButtonHTMLAttributes<HTMLButtonElement> & {
		variant?: Variant;
		size?: Size;
	}
>(({ variant = "default", size = "default", className, ...props }, ref) => (
	<button
		ref={ref}
		type="button"
		className={cn(
			"inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
			variantStyles[variant],
			sizeStyles[size],
			className,
		)}
		{...props}
	/>
));

Button.displayName = "Button";
