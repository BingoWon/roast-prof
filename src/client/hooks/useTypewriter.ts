import { useEffect, useRef, useState } from "react";

/**
 * Typewriter effect hook: reveals text progressively with punctuation pauses.
 * Returns the currently visible substring.
 *
 * @param text - Full text to reveal
 * @param active - Whether to animate (false = show full text immediately)
 * @param speed - Base interval per character in ms (default 30)
 */
export function useTypewriter(text: string, active = true, speed = 30): string {
	const [index, setIndex] = useState(0);
	const prevTextRef = useRef(text);

	// Reset index when text fundamentally changes (new turn)
	useEffect(() => {
		if (text !== prevTextRef.current) {
			// If new text starts with the old text (streaming append), don't reset
			if (!text.startsWith(prevTextRef.current)) {
				setIndex(0);
			}
			prevTextRef.current = text;
		}
	}, [text]);

	useEffect(() => {
		if (!active || index >= text.length) return;

		const char = text[index];
		// Pause longer on sentence-ending punctuation
		const isPunctuation = /[。！？.!?\n]/.test(char);
		const delay = isPunctuation ? speed * 4 : speed;

		const timer = setTimeout(() => setIndex((i) => i + 3), delay);
		return () => clearTimeout(timer);
	}, [index, text, active, speed]);

	if (!active) return text;
	return text.slice(0, Math.min(index + 3, text.length));
}
