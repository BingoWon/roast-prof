import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FC } from "react";

export const CollapsedHandle: FC<{
	direction: "left" | "right";
	onClick: () => void;
}> = ({ direction, onClick }) => {
	const isLeft = direction === "left";

	return (
		<div className="relative h-full flex-shrink-0 w-0">
			<button
				type="button"
				onClick={onClick}
				className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center
					w-[24px] h-[64px] transition-all duration-200
					bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800
					text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
					shadow-md hover:shadow-lg cursor-pointer
					${isLeft ? "left-0 rounded-r-full border-r border-y border-zinc-300 dark:border-zinc-700" : "right-0 rounded-l-full border-l border-y border-zinc-300 dark:border-zinc-700"}`}
				title={isLeft ? "展开侧边栏" : "展开聊天面板"}
			>
				{isLeft ? (
					<ChevronRight className="w-4 h-4" />
				) : (
					<ChevronLeft className="w-4 h-4" />
				)}
			</button>
		</div>
	);
};
