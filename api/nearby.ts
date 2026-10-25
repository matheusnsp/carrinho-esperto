import type { ServerResponse } from "node:http";
import { nearby } from "../server/handlers.js";
import { type VercelReq, send } from "./_vercel.js";

export default async function handler(req: VercelReq, res: ServerResponse) {
  send(res, await nearby(req.query));
}
