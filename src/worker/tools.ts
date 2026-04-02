import { tool, zodSchema } from "ai";
import { z } from "zod";

export const tools = {
	get_current_time: tool({
		description:
			"Returns the current date and time. Call this whenever the user asks about the current time or date.",
		inputSchema: zodSchema(
			z.object({
				timezone: z
					.string()
					.optional()
					.describe(
						"IANA timezone identifier, e.g. 'Asia/Shanghai'. Defaults to UTC.",
					),
			}),
		),
		execute: async ({ timezone = "UTC" }: { timezone?: string }) => {
			const now = new Date();
			return {
				utc: now.toISOString(),
				local: now.toLocaleString("en-US", { timeZone: timezone }),
				timezone,
			};
		},
	}),
	get_weather: tool({
		description: "Get the current weather for a location.",
		inputSchema: zodSchema(
			z.object({
				location: z.string().describe("The city name, e.g., 'San Francisco'"),
				unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
			}),
		),
		execute: async ({ location, unit }) => {
			await new Promise((resolve) => setTimeout(resolve, 800));
			return {
				location,
				temperature:
					Math.floor(Math.random() * 15) + (unit === "celsius" ? 10 : 50),
				condition: ["Partly Cloudy", "Sunny", "Raining", "Thunderstorm"][
					Math.floor(Math.random() * 4)
				],
				humidity: Math.floor(Math.random() * 40) + 40,
				wind_speed: Math.floor(Math.random() * 20) + 5,
				unit,
			};
		},
	}),
	search_web: tool({
		description: "Search the web for information.",
		inputSchema: zodSchema(
			z.object({
				query: z.string().describe("The search query"),
			}),
		),
		execute: async ({ query }) => {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			return {
				query,
				results: [
					{
						title: `Result 1 for ${query}`,
						url: "https://example.com/1",
						snippet:
							"This is a highly relevant snippet from the web about your query.",
					},
					{
						title: `Result 2 for ${query}`,
						url: "https://example.com/2",
						snippet: "Another interesting finding that provides more context.",
					},
					{
						title: `Related topic to ${query}`,
						url: "https://example.com/3",
						snippet:
							"This page contains background information that might be useful.",
					},
				],
			};
		},
	}),
};
