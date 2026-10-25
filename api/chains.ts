import type { ServerResponse } from "node:http";
import { chains } from "../server/handlers.js";
import { send } from "./_vercel.js";

export default function handler(_req: unknown, res: ServerResponse) {
  send(res, chains());
}
