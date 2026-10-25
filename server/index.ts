import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS, chainById } from "../shared/chains";
import type { SearchResponse } from "../shared/types";
import { searchChain } from "./vtex";
import { findNearby } from "./nearby";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.get("/api/chains", (_req, res) => {
  res.json(CHAINS);
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (query.length < 2) {
    res.status(400).json({ error: "Digite pelo menos 2 letras." });
    return;
  }
  const ids = String(req.query.chains ?? "").split(",").filter(Boolean);
  const chains = ids.length ? ids.map(chainById).filter((c) => c !== undefined) : CHAINS;

  const results = await Promise.all(chains.map((c) => searchChain(c, query)));
  res.json({ query, results } satisfies SearchResponse);
});

app.get("/api/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radius = Math.min(Math.max(Number(req.query.radius) || 3000, 300), 15000);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: "Informe lat e lon." });
    return;
  }
  try {
    res.json(await findNearby(lat, lon, radius));
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Erro ao buscar mercados" });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`MercaBom API em http://localhost:${PORT}`);
});
