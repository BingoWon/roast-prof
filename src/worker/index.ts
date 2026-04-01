import { Hono } from "hono";

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => {
	return c.json({ status: "ok", name: "roast-prof" });
});

export default app;
