import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
	Cloud,
	CloudLightning,
	CloudRain,
	Droplets,
	Sun,
	Wind,
} from "lucide-react";
import type { FC } from "react";
import { getToolStatus } from "../../lib/tool-status";
import { ToolCallFallback } from "./ToolCallFallback";

export const WeatherToolUI: FC<ToolCallMessagePartProps> = (props) => {
	const { args, result, isError } = props;
	const status = getToolStatus(result !== undefined, isError === true);
	const isRunning = status === "running";

	const a = args as { location: string; unit?: string } | undefined;
	const r = result as
		| {
				temperature: number;
				condition: string;
				humidity: number;
				wind_speed: number;
				unit: string;
				location?: string;
		  }
		| undefined;

	if (isError) return <ToolCallFallback {...props} />;

	const WeatherIcon = r?.condition.includes("Rain")
		? CloudRain
		: r?.condition.includes("Thunder")
			? CloudLightning
			: r?.condition.includes("Cloud")
				? Cloud
				: Sun;

	return (
		<div className="mb-4 w-full max-w-sm rounded-3xl bg-gradient-to-br from-blue-900/40 via-blue-900/20 to-purple-900/40 border border-blue-500/20 p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
			{isRunning ? (
				<div className="flex flex-col items-center justify-center py-6 gap-3">
					<Cloud className="w-8 h-8 text-blue-400 animate-pulse" />
					<div className="text-xs text-blue-300/80 font-medium tracking-wide uppercase">
						Fetching weather for {a?.location || "..."}
					</div>
				</div>
			) : (
				<div className="flex flex-col">
					<div className="flex items-start justify-between mb-4">
						<div>
							<h3 className="text-lg font-bold text-blue-100">
								{r?.location || a?.location}
							</h3>
							<p className="text-xs text-blue-300/80 font-medium tracking-wide uppercase mt-0.5">
								{r?.condition}
							</p>
						</div>
						<WeatherIcon className="w-10 h-10 text-blue-400 drop-shadow-lg" />
					</div>
					<div className="flex items-end gap-2 mb-6">
						<span className="text-5xl font-black text-white tracking-tighter">
							{r?.temperature}°
						</span>
						<span className="text-lg font-bold text-blue-400 mb-1">
							{r?.unit === "fahrenheit" ? "F" : "C"}
						</span>
					</div>
					<div className="grid grid-cols-2 gap-3 opacity-80">
						<div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
							<Droplets className="w-4 h-4 text-blue-400" />
							<span className="text-xs font-semibold text-blue-100">
								{r?.humidity}% Humidity
							</span>
						</div>
						<div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
							<Wind className="w-4 h-4 text-blue-400" />
							<span className="text-xs font-semibold text-blue-100">
								{r?.wind_speed} mph Wind
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
