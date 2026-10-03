import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./runtime.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
};
function serveStatic(req, res, path) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { res.writeHead(400).end(); return; }
  const candidate = resolve(dist, `.${decoded}`);
  const rel = relative(dist, candidate);
  if (rel.startsWith("..") || rel.includes(":") || rel.startsWith("\\")) {
    res.writeHead(403).end();
    return;
  }
  const target = extname(candidate) ? candidate : join(dist, "index.html");
  if (!existsSync(target)) {
    res.writeHead(404).end("Build the app first with npm run build.");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") res.end(); else res.end(readFileSync(target));
}

const server = createRuntime({ serveStatic });
const port = Number(process.env.PORT || 3001);
server.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`Skills-Ring listening on port ${port} with open registration and Supabase storage.`));
