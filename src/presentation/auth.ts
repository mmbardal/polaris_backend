import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson } from "@/presentation/helpers";
import { Domain } from "@/domain";
import { loginS, registerS } from "@/schema/auth_schema";

// --- Controller Functions ---

async function login(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, loginS);
  const result = await Domain.auth.login(body);
  finishRes(res, result);
}

async function register(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, registerS);
  const result = await Domain.auth.register(body);
  finishRes(res, { result });
}

// --- Route Registration ---

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/login", login);
  server.post(prefix + "/register", register);
}
