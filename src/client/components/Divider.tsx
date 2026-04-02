import { type FC, useCallback, useRef, useState } from "react";

export const Divider: FC<{
	onMouseDown: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	dragging: boolean;
}> = ({ onMouseDown, onDoubleClick, dragging }) => {
	const [hovered, setHovered] = useState(false);
	const [mouseY, setMouseY] = useState(0);
	const ref = useRef<HTMLDivElement>(null);

	const onMouseMove = useCallback((e: React.MouseEvent) => {
		if (!ref.current) return;
		const rect = ref.current.getBoundingClientRect();
		setMouseY(e.clientY - rect.top);
	}, []);

	const active = dragging || hovered;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag handle requires mouse events
		<div
			ref={ref}
			onMouseDown={onMouseDown}
			onDoubleClick={onDoubleClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onMouseMove={onMouseMove}
			className="relative flex-shrink-0 cursor-col-resize select-none w-[12px]"
		>
			{/* 竖线 */}
			<div
				className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-100 ${
					active
						? "w-[3px] bg-zinc-400 dark:bg-zinc-500"
						: "w-[1px] bg-zinc-200 dark:bg-zinc-800"
				}`}
			/>

			{/* 鼠标跟随把手 */}
			{active && (
				<div
					className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-opacity duration-75"
					style={{ top: mouseY - 20 }}
				>
					<div className="w-[6px] h-[40px] rounded-full bg-zinc-400 dark:bg-zinc-500 shadow-sm" />
				</div>
			)}
		</div>
	);
};
