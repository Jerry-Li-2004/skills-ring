import { createRuntime } from "../server/runtime.mjs";

let server;
export default function handler(req, res) {
  try {
    server ??= createRuntime();
    server.emit("request", req, res);
  } catch (error) {
    console.error("Runtime configuration failed", error.message);
    res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ error: "The server is not configured. Please contact support." }));
  }
}
