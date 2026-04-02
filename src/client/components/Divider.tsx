import { type FC, useCallback, useRef, useState } from "react";

export const Divider: FC<{
	onMouseDown: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	dragging: boolean;
}> = ({ onMouseDown, onDoubleClick, dragging }) => {
	const [hovered, setHovered] = useState(false);
	const [mouseY, setMouseY] = useState(0);
	const hitRef = useRef<HTMLDivElement>(null);

	const onMouseMove = useCallback((e: React.MouseEvent) => {
		if (!hitRef.current) return;
		const rect = hitRef.current.getBoundingClientRect();
		setMouseY(e.clientY - rect.top);
	}, []);

	const active = dragging || hovered;

	return (
		<div className="relative flex-shrink-0 w-0">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle */}
			<div
				ref={hitRef}
				onMouseDown={onMouseDown}
				onDoubleClick={onDoubleClick}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onMouseMove={onMouseMove}
				className="absolute top-0 bottom-0 -left-[6px] w-[12px] z-20 cursor-col-resize select-none"
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
		</div>
	);
};
