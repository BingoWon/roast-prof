import { type FC, useState } from "react";
import type { PersonaId } from "../../worker/model";
import { PERSONAS } from "../../worker/model";

/**
 * Circular character avatar loaded from /characters/{persona}/avatars/neutral.webp.
 * Falls back to emoji on error. Used throughout the app to represent personas.
 */
export const CharacterAvatar: FC<{
	persona: PersonaId;
	pose?: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	className?: string;
}> = ({ persona, pose = "neutral", size = "md", className = "" }) => {
	const p = PERSONAS[persona];
	const src = `/characters/${persona}/avatars/${pose}.webp`;
	const [errSrc, setErrSrc] = useState("");
	const err = errSrc === src;

	const dims: Record<string, string> = {
		xs: "w-6 h-6",
		sm: "w-8 h-8",
		md: "w-10 h-10",
		lg: "w-14 h-14",
		xl: "w-20 h-20",
	};

	const emojiSizes: Record<string, string> = {
		xs: "text-xs",
		sm: "text-sm",
		md: "text-lg",
		lg: "text-2xl",
		xl: "text-4xl",
	};

	return (
		<div
			className={`${dims[size]} rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
		>
			{err ? (
				<span className={emojiSizes[size]}>{p.emoji}</span>
			) : (
				<img
					src={src}
					alt={p.name}
					className="w-full h-full object-cover"
					onError={() => setErrSrc(src)}
				/>
			)}
		</div>
	);
};
