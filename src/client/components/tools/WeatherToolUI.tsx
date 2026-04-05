import { makeAssistantToolUI } from "@assistant-ui/react";
import { CloudRain, Droplets, MapPin, Sun, Wind } from "lucide-react";

type Args = { location: string };
type Result = {
	temperature: number;
	condition: string;
	humidity: number;
	wind_speed: number;
};

export const WeatherToolUI = makeAssistantToolUI<Args, Result>({
	toolName: "get_weather",
	render: ({ args, result, status }) => {
		const isRunning = status.type === "running";

		return (
			<div className="mb-4 w-64 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-sky-900/40 dark:to-blue-950/40 p-5 shadow-md dark:shadow-xl ring-1 ring-blue-500/10 dark:ring-white/10 relative overflow-hidden transition-all duration-300">
				{isRunning && (
					<div className="absolute inset-0 bg-white/50 dark:bg-black/20 flex items-center justify-center backdrop-blur-[2px] z-10">
						<div className="flex flex-col items-center gap-2">
							<CloudRain className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-bounce" />
							<span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
								正在获取 {args?.location || "..."} 的天气信息
							</span>
						</div>
					</div>
				)}

				<div className={`transition-opacity ${isRunning ? "opacity-30" : "opacity-100"}`}>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200">
							<MapPin className="w-4 h-4" />
							<span className="font-semibold">{args?.location || "未知"}</span>
						</div>
						<Sun className="w-8 h-8 text-yellow-500 dark:text-yellow-400 animate-[spin_10s_linear_infinite]" />
					</div>

					<div className="mb-4">
						<div className="text-5xl font-bold text-blue-900 dark:text-white tracking-tighter">
							{result?.temperature ?? "--"}°
						</div>
						<div className="text-sm font-medium text-blue-700/80 dark:text-blue-200/80 mt-1 capitalize">
							{result?.condition ?? "获取中"}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2 border-t border-blue-500/10 dark:border-white/10 pt-4">
						<div className="flex items-center gap-2">
							<Droplets className="w-4 h-4 text-blue-500 dark:text-blue-400" />
							<span className="text-xs font-semibold text-blue-800/80 dark:text-blue-100/80">
								{result?.humidity ?? "--"}% 湿度
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Wind className="w-4 h-4 text-blue-500 dark:text-blue-400" />
							<span className="text-xs font-semibold text-blue-800/80 dark:text-blue-100/80">
								{result?.wind_speed ?? "--"}风速
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	},
});
