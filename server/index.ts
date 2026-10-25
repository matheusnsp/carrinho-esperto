import express, { type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ApiResult, chains, search } from "./handlers.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const send = (res: Response, r: ApiResult) => res.status(r.status).json(r.body);

app.get("/api/chains", (_req, res) => send(res, chains()));
app.get("/api/search", async (req, res) => send(res, await search(req.query as Record<string, string>)));

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Carrinho Esperto API em http://localhost:${PORT}`);
});
