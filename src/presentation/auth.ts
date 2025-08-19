import type { Request, Response, Server } from "hyper-express";
import { HttpStatusCode } from "axios";
import { finishRes, HttpException, validateJson, verifyUserAccessGenerator } from "@/presentation/helpers";
import { loginOtpS, loginS, registerAdminS, registerUserS } from "@/schema/auth";
import { Session } from "@/data/session";
import { Domain } from "@/domain";
import type { AdminPayload, BranchPayload } from "@/domain/types";
import { isProduction } from "@/env_values";

async function captcha(_: Request, res: Response): Promise<void> {
  const result = await Domain.auth.captcha();
  finishRes(res, result);
}

async function login(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, loginS);

  await Domain.auth.login(body);

  finishRes(res);
}

async function loginOTP(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, loginOtpS);
  const data = await Domain.auth.loginOTP(body);

  if (data.role === "admin") {
    const result: AdminPayload = data.result as AdminPayload;
    res.setCookie(
      "token",
      await Session.adminSession.create(result.id, result as unknown as Record<string, unknown>),
      {
        httpOnly: true,
        maxAge: Number.MAX_SAFE_INTEGER,
        path: "/",
        secure: isProduction,
        sameSite: "lax"
      }
    );
    result.permissions = result.permissions.filter((permission) => permission !== "superUserEditor");

    finishRes(res, result as unknown as Record<string, unknown>);
  } else {
    const result: BranchPayload = data.result as BranchPayload;
    result.level = data.role as BranchPayload["level"];
    res.setCookie(
      "token",
      await Session.branchSession.create(result.id, result as unknown as Record<string, unknown>),
      {
        httpOnly: true,
        maxAge: Number.MAX_SAFE_INTEGER,
        path: "/",
        secure: isProduction,
        sameSite: "lax"
      }
    );

    finishRes(res, result as unknown as Record<string, unknown>);
  }
}

async function registerUser(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, registerUserS);

  await Domain.auth.registerUser(body, req.adminContext);

  finishRes(res);
}

async function registerAdmin(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, registerAdminS);

  await Domain.auth.registerAdmin(body, req.adminContext);

  finishRes(res);
}

function logout(): void {
  throw new HttpException(HttpStatusCode.Unauthorized);
}

export default function routes(server: Server, prefix: string): void {
  // pending todo merge logins and OTPs
  server.get(prefix + "/captcha", captcha);
  server.post(prefix + "/login", login);
  server.post(prefix + "/loginOTP", loginOTP);
  server.post(prefix + "/registerUser", registerUser, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/registerAdmin", registerAdmin, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/logout", logout, { middlewares: [verifyUserAccessGenerator] });
}
